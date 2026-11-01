const { pool } = require('../config/db');

// Code-side defaults for every system_config key the app reads, so a missing
// row (e.g. a database that was never seeded) degrades to sane behaviour
// instead of NaN scores.
const DEFAULTS = {
  'recommendation.distance_weight': 0.6,
  'recommendation.demand_weight': 0.4,
  'recommendation.max_radius_km': 15,
  'recommendation.max_candidates': 5,
  'freshness.fresh_min_score': 70,
};

async function getNumbers() {
  const [rows] = await pool.query('SELECT config_key, config_value FROM system_config');
  const config = { ...DEFAULTS };
  for (const { config_key: key, config_value: value } of rows) {
    if (key in DEFAULTS && Number.isFinite(Number(value))) {
      config[key] = Number(value);
    }
  }
  return config;
}

module.exports = { getNumbers };
