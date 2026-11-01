const bcrypt = require('bcryptjs');

// Matches database/seeds/001_seed_admin_user.sql's hashSync(password, 10) example.
const SALT_ROUNDS = 10;

function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = { hashPassword, comparePassword };
