const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const uniqueSuffix = Date.now();
const donor = {
  name: 'Test Donor',
  email: `test-donor-${uniqueSuffix}@example.com`,
  password: 'password123',
  role: 'donor',
  businessName: 'Test Kitchen',
  businessType: 'restaurant',
  address: '1 Test Street',
  latitude: 28.6139,
  longitude: 77.209,
};

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email = ?', [donor.email]);
  await pool.end();
});

describe('POST /api/auth/register', () => {
  it('creates a donor account and its profile row', async () => {
    const res = await request(app).post('/api/auth/register').send(donor);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: donor.email, role: 'donor' });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('rejects a duplicate email with 409', async () => {
    const res = await request(app).post('/api/auth/register').send(donor);
    expect(res.status).toBe(409);
  });

  it('rejects an incomplete donor payload with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Nobody', email: 'nobody@example.com', password: 'password123', role: 'donor' });
    expect(res.status).toBe(400);
  });

  it('rejects self-registration as admin with 403', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...donor, email: 'wannabe-admin@example.com', role: 'admin' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials and sets a refresh cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: donor.email, password: donor.password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=/);
  });

  it('rejects an incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: donor.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user and profile for a valid access token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: donor.email, password: donor.password });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(donor.email);
    expect(res.body.profile.business_name).toBe(donor.businessName);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues a new access token from a valid refresh cookie', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: donor.email, password: donor.password });

    const refreshCookie = loginRes.headers['set-cookie'][0];

    const res = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('rejects a missing refresh token with 401', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});
