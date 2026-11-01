const userModel = require('../models/user.model');
const ApiError = require('../utils/ApiError');

// Every donation-flow action is done "as" a role profile (donor_id, ngo_id,
// volunteer_id), not as a bare user_id — this resolves one or fails loudly.
async function requireProfile(role, userId) {
  const profile = await userModel.getProfileByRole(role, userId);
  if (!profile) {
    throw new ApiError(403, `No ${role} profile is linked to this account`);
  }
  return profile;
}

module.exports = { requireProfile };
