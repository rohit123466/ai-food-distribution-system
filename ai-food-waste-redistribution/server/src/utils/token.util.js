const jwt = require('jsonwebtoken');
const env = require('../config/env');

// FR-S1: all authentication issued/verified as JWT with role embedded in claims.
// The `type` claim stops an access token being replayed as a refresh token or vice versa.
function signAccessToken({ sub, role }) {
  return jwt.sign({ sub, role, type: 'access' }, env.jwt.secret, { expiresIn: env.jwt.accessTtl });
}

function signRefreshToken({ sub, role }) {
  return jwt.sign({ sub, role, type: 'refresh' }, env.jwt.secret, { expiresIn: env.jwt.refreshTtl });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = { signAccessToken, signRefreshToken, verifyToken };
