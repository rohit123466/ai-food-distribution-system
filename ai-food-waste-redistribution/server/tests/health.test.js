const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('responds with a status field', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('service', 'server');
  });
});
