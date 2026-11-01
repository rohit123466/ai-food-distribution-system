const { verifyToken } = require('../utils/token.util');
const ApiError = require('../utils/ApiError');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'));
  }

  if (payload.type !== 'access') {
    return next(new ApiError(401, 'Invalid token type'));
  }

  req.user = { id: payload.sub, role: payload.role };
  next();
}

// RBAC gate. Usage: router.get('/admin-only', authenticate, authorize('admin'), handler)
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions for this action'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
