const { withTransaction } = require('../config/db');
const matchModel = require('../models/match.model');
const donationModel = require('../models/donation.model');
const notificationModel = require('../models/notification.model');
const { requireProfile } = require('./profile.service');
const ApiError = require('../utils/ApiError');

async function listOpen(userId) {
  const ngo = await requireProfile('ngo', userId);
  return matchModel.listOpenForNgo(ngo.ngo_id);
}

// Locks the match and its donation together, so two NGOs pressing "Accept" on
// the same donation at the same moment can't both win: the second one waits
// for the lock, then sees status 'accepted' and gets a 409.
async function lockOwnOpenMatch(conn, ngo, matchId) {
  const match = await matchModel.lockWithDonation(conn, matchId);
  if (!match || match.ngo_id !== ngo.ngo_id) {
    throw new ApiError(404, 'Match not found');
  }
  if (match.match_status !== 'recommended') {
    throw new ApiError(409, `You already ${match.match_status} this donation`);
  }
  if (match.donation_status !== 'posted') {
    throw new ApiError(409, 'Another NGO has already accepted this donation');
  }
  return match;
}

async function accept(userId, matchId) {
  const ngo = await requireProfile('ngo', userId);

  const match = await withTransaction(async (conn) => {
    const locked = await lockOwnOpenMatch(conn, ngo, matchId);
    if (new Date(locked.expiry_estimate) <= new Date()) {
      throw new ApiError(409, 'This donation has passed its safe window');
    }
    await donationModel.markAccepted(conn, locked.donation_id, ngo.ngo_id);
    await matchModel.setStatus(conn, matchId, 'accepted');
    await matchModel.expireOthers(conn, locked.donation_id, matchId);
    return locked;
  });

  const donation = await donationModel.findById(match.donation_id);
  await notificationModel.create({
    userId: donation.donor_user_id,
    donationId: donation.donation_id,
    type: 'status_change',
    message: `Your donation #${donation.donation_id} was accepted by ${ngo.ngo_name}. A volunteer will be assigned next.`,
  });
  return donation;
}

async function reject(userId, matchId) {
  const ngo = await requireProfile('ngo', userId);
  await withTransaction(async (conn) => {
    await lockOwnOpenMatch(conn, ngo, matchId);
    await matchModel.setStatus(conn, matchId, 'rejected');
  });
}

module.exports = { listOpen, accept, reject };
