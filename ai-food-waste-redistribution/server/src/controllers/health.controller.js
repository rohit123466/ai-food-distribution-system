const { checkConnection } = require('../config/db');

async function getHealth(req, res) {
  const health = { status: 'ok', service: 'server', timestamp: new Date().toISOString() };

  try {
    await checkConnection();
    health.db = 'connected';
  } catch (err) {
    health.db = 'unreachable';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
}

module.exports = { getHealth };
