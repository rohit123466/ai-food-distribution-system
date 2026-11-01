const userModel = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { signAccessToken, signRefreshToken, verifyToken } = require('../utils/token.util');
const ApiError = require('../utils/ApiError');

function sanitizeUser(user) {
  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...safe } = user;
  return safe;
}

function issueTokens(user) {
  const payload = { sub: user.user_id, role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

async function register({ name, email, password, phone, role, ...profileFields }) {
  // FR-D1/FR-N1/FR-V1 only define self-registration for donor/ngo/volunteer;
  // the admin row is bootstrapped separately via database/seeds/001_seed_admin_user.sql.
  if (role === 'admin') {
    throw new ApiError(403, 'Admin accounts cannot self-register');
  }

  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);

  let userId;
  try {
    userId = await userModel.createUserWithProfile(
      { name, email, passwordHash, phone, role },
      profileFields,
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new ApiError(409, 'That registration number is already in use');
    }
    throw err;
  }

  const user = await userModel.findById(userId);
  return user;
}

async function login({ email, password }) {
  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const tokens = issueTokens(user);
  return { ...tokens, user: sanitizeUser(user) };
}

async function refresh(refreshToken) {
  if (!refreshToken) {
    throw new ApiError(401, 'Missing refresh token');
  }

  let payload;
  try {
    payload = verifyToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  if (payload.type !== 'refresh') {
    throw new ApiError(401, 'Invalid token type');
  }

  const user = await userModel.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'User no longer exists');
  }

  return issueTokens(user);
}

async function getCurrentUser(userId, role) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const profile = await userModel.getProfileByRole(role, userId);
  return { user, profile };
}

module.exports = { register, login, refresh, getCurrentUser };
