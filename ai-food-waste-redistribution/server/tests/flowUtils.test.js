const { scoreMatch, rankCandidates } = require('../src/services/matching.service');
const { computeExpiry } = require('../src/utils/shelfLife.util');
const { generateCode, hashCode, codeMatches } = require('../src/utils/handoverCode.util');
const { computeImpact } = require('../src/utils/impact.util');

const config = {
  'recommendation.distance_weight': 0.6,
  'recommendation.demand_weight': 0.4,
  'recommendation.max_radius_km': 15,
  'recommendation.max_candidates': 5,
};

describe('scoreMatch', () => {
  it('reproduces the seeded match scores', () => {
    // database/seeds/002_seed_sample_data.sql: donation 1 -> NGO 1 and NGO 2
    expect(scoreMatch(3.1, 'high', config).score).toBeCloseTo(0.876, 3);
    expect(scoreMatch(12.4, 'medium', config).score).toBeCloseTo(0.344, 3);
  });
});

describe('rankCandidates', () => {
  const donor = { latitude: 28.6315, longitude: 77.2167 };
  const ngo = (id, latitude, longitude, demand) => ({
    ngo_id: id,
    latitude,
    longitude,
    current_demand_level: demand,
  });

  it('drops NGOs beyond the radius and ranks the rest by score', () => {
    const ranked = rankCandidates(
      donor,
      [
        ngo(1, 28.6519, 77.1909, 'high'), // Karol Bagh, ~3 km
        ngo(2, 28.6400, 77.2200, 'low'), // ~1 km but low demand
        ngo(3, 27.1767, 78.0081, 'high'), // Agra, far outside 15 km
      ],
      config,
    );
    expect(ranked.map((c) => c.ngo.ngo_id)).toEqual([1, 2]);
    expect(ranked.map((c) => c.rank)).toEqual([1, 2]);
  });
});

describe('computeExpiry', () => {
  it('gives cooked food at room temperature a 4-hour window', () => {
    const prepared = new Date('2026-07-20T12:00:00Z');
    expect(computeExpiry(prepared, 'cooked_meal', 'room_temp').toISOString()).toBe('2026-07-20T16:00:00.000Z');
  });
});

describe('handover codes', () => {
  it('are stable, distinct per purpose, and verify case-insensitively against their hash', () => {
    const pickup = generateCode('pickup', 42, 7);
    const delivery = generateCode('delivery', 42, 7);
    expect(pickup).toMatch(/^[A-Z2-9]{8}$/);
    expect(generateCode('pickup', 42, 7)).toBe(pickup);
    expect(delivery).not.toBe(pickup);
    expect(codeMatches(pickup.toLowerCase(), hashCode(pickup))).toBe(true);
    expect(codeMatches(delivery, hashCode(pickup))).toBe(false);
  });
});

describe('computeImpact', () => {
  it('uses the seeded per-kg factors', () => {
    expect(computeImpact(45)).toEqual({ co2SavedKg: 112.5, mealsEquivalent: 90 });
  });
});
