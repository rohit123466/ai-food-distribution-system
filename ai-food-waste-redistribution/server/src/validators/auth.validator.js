const ApiError = require('../utils/ApiError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTERABLE_ROLES = ['donor', 'ngo', 'volunteer'];
const BUSINESS_TYPES = ['restaurant', 'hotel', 'bakery', 'grocery_store', 'household'];
const VEHICLE_TYPES = ['on_foot', 'bike', 'car', 'van'];
const DEMAND_LEVELS = ['low', 'medium', 'high'];
const DIET_TYPES = ['veg', 'non_veg', 'jain', 'vegan'];

function isValidLat(v) {
  return typeof v === 'number' && v >= -90 && v <= 90;
}

function isValidLng(v) {
  return typeof v === 'number' && v >= -180 && v <= 180;
}

function validateRegister(req, res, next) {
  const { name, email, password, role } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return next(new ApiError(400, 'name is required (min 2 characters)'));
  }
  if (!email || !EMAIL_RE.test(email)) {
    return next(new ApiError(400, 'a valid email is required'));
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return next(new ApiError(400, 'password must be at least 8 characters'));
  }
  if (!REGISTERABLE_ROLES.includes(role)) {
    return next(new ApiError(400, `role must be one of: ${REGISTERABLE_ROLES.join(', ')}`));
  }

  if (role === 'donor') {
    const { businessName, businessType, address, latitude, longitude } = req.body;
    if (!businessName) return next(new ApiError(400, 'businessName is required for donors'));
    if (!BUSINESS_TYPES.includes(businessType)) {
      return next(new ApiError(400, `businessType must be one of: ${BUSINESS_TYPES.join(', ')}`));
    }
    if (!address) return next(new ApiError(400, 'address is required for donors'));
    if (!isValidLat(latitude) || !isValidLng(longitude)) {
      return next(new ApiError(400, 'latitude/longitude must be numbers within valid range'));
    }
  } else if (role === 'ngo') {
    const { ngoName, registrationNumber, address, latitude, longitude, currentDemandLevel } = req.body;
    if (!ngoName) return next(new ApiError(400, 'ngoName is required for NGOs'));
    if (!registrationNumber) return next(new ApiError(400, 'registrationNumber is required for NGOs'));
    if (!address) return next(new ApiError(400, 'address is required for NGOs'));
    if (!isValidLat(latitude) || !isValidLng(longitude)) {
      return next(new ApiError(400, 'latitude/longitude must be numbers within valid range'));
    }
    if (currentDemandLevel !== undefined && !DEMAND_LEVELS.includes(currentDemandLevel)) {
      return next(new ApiError(400, `currentDemandLevel must be one of: ${DEMAND_LEVELS.join(', ')}`));
    }
    const { acceptedDiets } = req.body;
    if (
      acceptedDiets !== undefined &&
      (!Array.isArray(acceptedDiets) || acceptedDiets.length === 0 || !acceptedDiets.every((d) => DIET_TYPES.includes(d)))
    ) {
      return next(new ApiError(400, `acceptedDiets must be a non-empty list drawn from: ${DIET_TYPES.join(', ')}`));
    }
  } else if (role === 'volunteer') {
    const { vehicleType } = req.body;
    if (!VEHICLE_TYPES.includes(vehicleType)) {
      return next(new ApiError(400, `vehicleType must be one of: ${VEHICLE_TYPES.join(', ')}`));
    }
  }

  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  if (!email || !EMAIL_RE.test(email)) {
    return next(new ApiError(400, 'a valid email is required'));
  }
  if (!password) {
    return next(new ApiError(400, 'password is required'));
  }
  next();
}

module.exports = { validateRegister, validateLogin };
