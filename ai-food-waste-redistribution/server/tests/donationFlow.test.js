// End-to-end: post -> AI check -> match -> accept -> claim -> pickup scan ->
// delivery scan, against the real database, with only the AI service mocked.
jest.mock('../src/services/ai.service');

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const env = require('../src/config/env');
const aiService = require('../src/services/ai.service');

// 1x1 PNG. Its contents don't matter (the AI service is mocked); it just has
// to arrive as an image/png upload.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const suffix = Date.now();
// Somewhere in the South Pacific: far from any real donor/NGO, so this test
// can't offer real donations to its NGOs or vice versa.
const SPOT = { latitude: -45.0, longitude: -140.0 };
const password = 'password123';

const users = {
  donor: {
    name: 'Flow Donor',
    email: `flow-donor-${suffix}@example.com`,
    role: 'donor',
    businessName: 'Flow Test Kitchen',
    businessType: 'restaurant',
    address: 'Test Spot',
    ...SPOT,
  },
  ngo: {
    name: 'Flow NGO',
    email: `flow-ngo-${suffix}@example.com`,
    role: 'ngo',
    ngoName: 'Flow Test NGO',
    registrationNumber: `FLOW-${suffix}`,
    address: 'Test Spot, 2 km away',
    latitude: SPOT.latitude + 0.018,
    longitude: SPOT.longitude,
    currentDemandLevel: 'high',
  },
  vegNgo: {
    name: 'Flow Veg NGO',
    email: `flow-veg-ngo-${suffix}@example.com`,
    role: 'ngo',
    ngoName: 'Flow Veg-only NGO',
    registrationNumber: `FLOW-VEG-${suffix}`,
    address: 'Test Spot, 1 km away',
    latitude: SPOT.latitude + 0.009,
    longitude: SPOT.longitude,
    acceptedDiets: ['veg', 'jain', 'vegan'],
  },
  volunteer: {
    name: 'Flow Volunteer',
    email: `flow-volunteer-${suffix}@example.com`,
    role: 'volunteer',
    vehicleType: 'bike',
  },
};
const tokens = {};

function aiResult(score) {
  return { freshness_score: score, confidence: 0.6, model: 'heuristic-v1', signals: {}, labels: [], warnings: [] };
}

function postDonation(overrides = {}) {
  const fields = {
    foodType: 'Chicken biryani',
    foodCategory: 'cooked_meal',
    storageCondition: 'hot_held',
    dietType: 'non_veg',
    quantityKg: '12.5',
    preparedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ...overrides,
  };
  let req = request(app).post('/api/donations').set('Authorization', `Bearer ${tokens.donor}`);
  for (const [key, value] of Object.entries(fields)) req = req.field(key, value);
  return req.attach('image', PNG, 'food.png');
}

const as = (role) => ({ Authorization: `Bearer ${tokens[role]}` });

beforeAll(async () => {
  for (const [key, user] of Object.entries(users)) {
    const reg = await request(app).post('/api/auth/register').send({ ...user, password });
    expect(reg.status).toBe(201);
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password });
    tokens[key] = login.body.accessToken;
  }
});

afterAll(async () => {
  // Donations can never be hard-deleted (migration 010 makes their status log
  // immutable), so these test accounts stay. Stop the test NGOs from ever being
  // matched again, and remove the uploaded photos.
  await pool.query(
    "UPDATE ngo_profiles np JOIN users u ON u.user_id = np.user_id SET np.accepted_diets = '' WHERE u.email IN (?, ?)",
    [users.ngo.email, users.vegNgo.email],
  );
  const [images] = await pool.query(
    `SELECT img.image_url FROM donation_images img
     JOIN donations d ON d.donation_id = img.donation_id
     JOIN donor_profiles dp ON dp.donor_id = d.donor_id
     JOIN users u ON u.user_id = dp.user_id WHERE u.email = ?`,
    [users.donor.email],
  );
  for (const { image_url: url } of images) {
    fs.rmSync(path.join(env.uploadsDir, 'donations', path.basename(url)), { force: true });
  }
  await pool.end();
});

describe('POST /api/donations validation', () => {
  it('rejects a donation without a photo', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set(as('donor'))
      .field('foodType', 'Rice')
      .field('foodCategory', 'cooked_meal')
      .field('storageCondition', 'room_temp')
      .field('dietType', 'veg')
      .field('quantityKg', '5')
      .field('preparedAt', new Date().toISOString());
    expect(res.status).toBe(400);
  });

  it('rejects food already past its safe window', async () => {
    const res = await postDonation({
      storageCondition: 'room_temp',
      preparedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/safe window/);
  });

  it('forbids non-donors from posting', async () => {
    const res = await request(app).post('/api/donations').set(as('ngo')).send({});
    expect(res.status).toBe(403);
  });
});

describe('happy path: post -> AI -> match -> pickup -> delivery', () => {
  let donationId;
  let matchId;

  it('posts a donation, scores it fresh and offers it only to the NGO that accepts non-veg', async () => {
    aiService.analyzeImage.mockResolvedValueOnce(aiResult(88));
    const res = await postDonation();
    expect(res.status).toBe(201);
    expect(res.body.donation).toMatchObject({ freshness_status: 'fresh', status: 'posted' });
    expect(res.body.matchedNgoCount).toBe(1);
    donationId = res.body.donation.donation_id;

    const vegFeed = await request(app).get('/api/matches').set(as('vegNgo'));
    expect(vegFeed.body.matches.find((m) => m.donation_id === donationId)).toBeUndefined();

    const feed = await request(app).get('/api/matches').set(as('ngo'));
    const match = feed.body.matches.find((m) => m.donation_id === donationId);
    expect(match).toBeDefined();
    expect(Number(match.distance_km)).toBeCloseTo(2, 0);
    matchId = match.match_id;
  });

  it('lets the NGO accept, and refuses a second accept', async () => {
    const res = await request(app).post(`/api/matches/${matchId}/accept`).set(as('ngo'));
    expect(res.status).toBe(200);
    expect(res.body.donation.status).toBe('accepted');

    const again = await request(app).post(`/api/matches/${matchId}/accept`).set(as('ngo'));
    expect(again.status).toBe(409);
  });

  it('shows the pickup to volunteers and lets one claim it', async () => {
    const available = await request(app).get('/api/tasks/available').set(as('volunteer'));
    expect(available.body.tasks.map((t) => t.donation_id)).toContain(donationId);

    const res = await request(app).post(`/api/tasks/${donationId}/claim`).set(as('volunteer'));
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('assigned');
  });

  it('verifies pickup only with the donor’s code', async () => {
    const codeRes = await request(app).get(`/api/donations/${donationId}/pickup-code`).set(as('donor'));
    expect(codeRes.status).toBe(200);
    expect(codeRes.body.qr).toMatch(/^data:image\/png;base64,/);

    const wrong = await request(app).post(`/api/tasks/${donationId}/pickup`).set(as('volunteer')).send({ code: 'WRONG123' });
    expect(wrong.status).toBe(400);

    // The delivery code must not work at pickup.
    const deliveryCode = await request(app).get(`/api/donations/${donationId}/delivery-code`).set(as('ngo'));
    const swapped = await request(app)
      .post(`/api/tasks/${donationId}/pickup`)
      .set(as('volunteer'))
      .send({ code: deliveryCode.body.code });
    expect(swapped.status).toBe(400);

    const ok = await request(app)
      .post(`/api/tasks/${donationId}/pickup`)
      .set(as('volunteer'))
      .send({ code: codeRes.body.code.toLowerCase() });
    expect(ok.status).toBe(200);
    expect(ok.body.task.status).toBe('picked_up');
  });

  it('verifies delivery with the NGO’s code and logs the impact', async () => {
    const codeRes = await request(app).get(`/api/donations/${donationId}/delivery-code`).set(as('ngo'));
    const res = await request(app)
      .post(`/api/tasks/${donationId}/deliver`)
      .set(as('volunteer'))
      .send({ code: codeRes.body.code });
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('delivered');
    expect(res.body.task.impact).toEqual({ co2SavedKg: 31.25, mealsEquivalent: 25 });

    const mine = await request(app).get('/api/donations/mine').set(as('donor'));
    expect(Number(mine.body.impact.meals)).toBeGreaterThanOrEqual(25);

    const [log] = await pool.query('SELECT new_status FROM donation_status_log WHERE donation_id = ? ORDER BY log_id', [
      donationId,
    ]);
    expect(log.map((r) => r.new_status)).toEqual(['posted', 'accepted', 'assigned', 'picked_up', 'delivered']);
  });
});

describe('AI outcomes other than fresh', () => {
  it('rejects a donation the AI scores as spoiled and offers it to nobody', async () => {
    aiService.analyzeImage.mockResolvedValueOnce(aiResult(35));
    const res = await postDonation();
    expect(res.status).toBe(201);
    expect(res.body.donation).toMatchObject({ freshness_status: 'spoiled', status: 'rejected' });
    expect(res.body.matchedNgoCount).toBe(0);
  });

  it('still saves the donation when the AI service is down, and retry reports 503 until it is back', async () => {
    aiService.analyzeImage.mockResolvedValueOnce(null);
    const res = await postDonation({ dietType: 'veg' });
    expect(res.status).toBe(201);
    expect(res.body.donation.freshness_status).toBe('pending');
    expect(res.body.aiChecked).toBe(false);
    const id = res.body.donation.donation_id;

    aiService.analyzeImage.mockResolvedValueOnce(null);
    const stillDown = await request(app).post(`/api/donations/${id}/retry`).set(as('donor'));
    expect(stillDown.status).toBe(503);

    aiService.analyzeImage.mockResolvedValueOnce(aiResult(90));
    const back = await request(app).post(`/api/donations/${id}/retry`).set(as('donor'));
    expect(back.status).toBe(200);
    expect(back.body.donation.freshness_status).toBe('fresh');
    // Veg food: both test NGOs accept it.
    expect(back.body.matchedNgoCount).toBe(2);

    // Declining removes it from that NGO's feed. (The other open offer only ever
    // shows to this run's test NGO, so it's left as is.)
    const vegFeed = await request(app).get('/api/matches').set(as('vegNgo'));
    const vegMatch = vegFeed.body.matches.find((m) => m.donation_id === id);
    expect((await request(app).post(`/api/matches/${vegMatch.match_id}/reject`).set(as('vegNgo'))).status).toBe(200);
    const afterReject = await request(app).get('/api/matches').set(as('vegNgo'));
    expect(afterReject.body.matches.find((m) => m.donation_id === id)).toBeUndefined();
  });
});
