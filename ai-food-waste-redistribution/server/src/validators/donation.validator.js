const ApiError = require('../utils/ApiError');
const { FOOD_CATEGORIES, STORAGE_CONDITIONS } = require('../utils/shelfLife.util');

const DIET_TYPES = ['veg', 'non_veg', 'jain', 'vegan'];
const CLOCK_SKEW_MS = 5 * 60 * 1000;

// Runs after the multipart parser, so every field arrives as a string; numbers
// and dates are normalised onto req.body here for the service to use as-is.
function validateCreateDonation(req, res, next) {
  const { foodType, foodCategory, storageCondition, dietType, allergens, quantityKg, preparedAt } = req.body;

  if (!req.file) {
    return next(new ApiError(400, 'a photo of the food is required for the freshness check'));
  }
  if (!foodType || typeof foodType !== 'string' || foodType.trim().length < 2 || foodType.length > 100) {
    return next(new ApiError(400, 'foodType is required (2-100 characters)'));
  }
  if (!FOOD_CATEGORIES.includes(foodCategory)) {
    return next(new ApiError(400, `foodCategory must be one of: ${FOOD_CATEGORIES.join(', ')}`));
  }
  if (!STORAGE_CONDITIONS.includes(storageCondition)) {
    return next(new ApiError(400, `storageCondition must be one of: ${STORAGE_CONDITIONS.join(', ')}`));
  }
  if (!DIET_TYPES.includes(dietType)) {
    return next(new ApiError(400, `dietType must be one of: ${DIET_TYPES.join(', ')}`));
  }
  if (allergens !== undefined && String(allergens).length > 255) {
    return next(new ApiError(400, 'allergens must be 255 characters or fewer'));
  }

  const quantity = Number(quantityKg);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 9999.99) {
    return next(new ApiError(400, 'quantityKg must be a number greater than 0 and at most 9999.99'));
  }

  const prepared = new Date(preparedAt);
  if (!preparedAt || Number.isNaN(prepared.getTime())) {
    return next(new ApiError(400, 'preparedAt must be a valid date/time'));
  }
  if (prepared.getTime() > Date.now() + CLOCK_SKEW_MS) {
    return next(new ApiError(400, 'preparedAt cannot be in the future'));
  }

  req.body = {
    foodType: foodType.trim(),
    foodCategory,
    storageCondition,
    dietType,
    allergens: allergens ? String(allergens).trim() : null,
    quantityKg: Number(quantity.toFixed(2)),
    preparedAt: prepared,
  };
  next();
}

function validateHandoverCode(req, res, next) {
  const { code } = req.body;
  if (!code || typeof code !== 'string' || code.trim().length < 4 || code.length > 64) {
    return next(new ApiError(400, 'code is required: scan the QR or type the code shown under it'));
  }
  next();
}

function validateIdParam(name) {
  return (req, res, next) => {
    const id = Number(req.params[name]);
    if (!Number.isInteger(id) || id <= 0) {
      return next(new ApiError(400, `${name} must be a positive integer`));
    }
    req.params[name] = id;
    next();
  };
}

module.exports = { validateCreateDonation, validateHandoverCode, validateIdParam, DIET_TYPES };
