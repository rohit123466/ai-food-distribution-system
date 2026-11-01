const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

const REFRESH_COOKIE_NAME = 'refreshToken';

// maxAge is expressed in ms and mirrors the JWT_REFRESH_TTL default (7d) — if you change
// JWT_REFRESH_TTL, update this to match so the cookie doesn't outlive (or underlive) the token.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({ message: 'Registration successful', user });
});

const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.login(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ accessToken, user });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  const { accessToken, refreshToken } = await authService.refresh(token);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ accessToken });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.status(200).json({ message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  const { user, profile } = await authService.getCurrentUser(req.user.id, req.user.role);
  res.status(200).json({ user, profile });
});

module.exports = { register, login, refresh, logout, me };
