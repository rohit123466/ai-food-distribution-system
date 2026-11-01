require('dotenv').config();
const path = require('path');

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  db: {
    host: required('DB_HOST', 'localhost'),
    port: Number(process.env.DB_PORT) || 3306,
    name: required('DB_NAME', 'food_waste_redistribution'),
    user: required('DB_USER', 'root'),
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: required('JWT_SECRET', 'dev-secret-change-me'),
    accessTtl: process.env.JWT_ACCESS_TTL || '30m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  // Local-disk fallback for donation photos (the Cloudinary vars in .env.example
  // are not wired up yet). Served read-only at /uploads by app.js.
  uploadsDir: path.join(__dirname, '..', '..', 'uploads'),
};
