const { withTransaction } = require('../config/db');
const donationModel = require('../models/donation.model');
const pickupModel = require('../models/pickup.model');
const notificationModel = require('../models/notification.model');
const { requireProfile } = require('./profile.service');
const { haversineKm } = require('../utils/geo.util');
const { generateCode, hashCode, codeMatches } = require('../utils/handoverCode.util');
const { computeImpact } = require('../utils/impact.util');
const ApiError = require('../utils/ApiError');

function withTripDistances(donation, origin) {
  const tripKm = haversineKm(
    Number(donation.donor_lat),
    Number(donation.donor_lng),
    Number(donation.ngo_lat),
    Number(donation.ngo_lng),
  );
  const toPickupKm = origin
    ? haversineKm(origin.lat, origin.lng, Number(donation.donor_lat), Number(donation.donor_lng))
    : null;
  return {
    ...donation,
    trip_km: Number(tripKm.toFixed(2)),
    to_pickup_km: toPickupKm === null ? null : Number(toPickupKm.toFixed(2)),
  };
}

// Accepted donations nobody is carrying yet. Nearest pickup first when the
// volunteer's location is known (from the browser, else their saved profile
// location); most urgent first otherwise.
async function listAvailable(userId, location) {
  const volunteer = await requireProfile('volunteer', userId);
  let origin = location;
  if (!origin && volunteer.current_lat !== null && volunteer.current_lng !== null) {
    origin = { lat: Number(volunteer.current_lat), lng: Number(volunteer.current_lng) };
  }

  const tasks = (await donationModel.listAwaitingVolunteer()).map((d) => withTripDistances(d, origin));
  if (origin) {
    tasks.sort((a, b) => a.to_pickup_km - b.to_pickup_km);
  }
  return tasks;
}

async function listMine(userId) {
  const volunteer = await requireProfile('volunteer', userId);
  const donations = await donationModel.listByVolunteer(volunteer.volunteer_id);
  return donations.map((d) => withTripDistances(d, null));
}

async function notifyParties(donation, type, { donor, ngo }) {
  if (donor) {
    await notificationModel.create({ userId: donation.donor_user_id, donationId: donation.donation_id, type, message: donor });
  }
  if (ngo) {
    await notificationModel.create({ userId: donation.ngo_user_id, donationId: donation.donation_id, type, message: ngo });
  }
}

async function claim(userId, donationId) {
  const volunteer = await requireProfile('volunteer', userId);

  await withTransaction(async (conn) => {
    const donation = await donationModel.lockById(conn, donationId);
    if (!donation) {
      throw new ApiError(404, 'Donation not found');
    }
    if (donation.status !== 'accepted' || donation.assigned_volunteer_id !== null) {
      throw new ApiError(409, 'This pickup has already been taken by another volunteer');
    }
    if (new Date(donation.expiry_estimate) <= new Date()) {
      throw new ApiError(409, 'This donation has passed its safe window');
    }

    await donationModel.markAssigned(conn, donationId, volunteer.volunteer_id);
    const pickupId = await pickupModel.create(conn, { donationId, volunteerId: volunteer.volunteer_id });
    await pickupModel.setCodeHashes(conn, pickupId, {
      pickupHash: hashCode(generateCode('pickup', donationId, pickupId)),
      deliveryHash: hashCode(generateCode('delivery', donationId, pickupId)),
    });
  });

  const donation = await donationModel.findById(donationId);
  await notifyParties(donation, 'assignment', {
    donor: `${donation.volunteer_name} is coming to collect donation #${donationId}. Show them the pickup QR code from your dashboard.`,
    ngo: `${donation.volunteer_name} will deliver donation #${donationId} to you.`,
  });
  return withTripDistances(donation, null);
}

// Shared shape of both handovers: lock the donation, check it's this
// volunteer's and at the expected step, check the scanned code against the
// stored hash, then advance. A wrong code changes nothing.
async function verifyHandover(userId, donationId, code, { expectedStatus, hashColumn, onVerified }) {
  const volunteer = await requireProfile('volunteer', userId);

  await withTransaction(async (conn) => {
    const donation = await donationModel.lockById(conn, donationId);
    if (!donation || donation.assigned_volunteer_id !== volunteer.volunteer_id) {
      throw new ApiError(404, 'Donation not found in your tasks');
    }
    if (donation.status !== expectedStatus) {
      throw new ApiError(409, `Donation is ${donation.status.replace('_', ' ')}, not ${expectedStatus.replace('_', ' ')}`);
    }
    const pickup = await pickupModel.findByDonation(donationId, conn);
    if (!codeMatches(code, pickup?.[hashColumn])) {
      throw new ApiError(400, 'That code does not match this donation. Check you scanned the right QR.');
    }
    await onVerified(conn, donation, pickup);
  });

  return donationModel.findById(donationId);
}

async function confirmPickup(userId, donationId, code) {
  const donation = await verifyHandover(userId, donationId, code, {
    expectedStatus: 'assigned',
    hashColumn: 'qr_code_hash',
    onVerified: async (conn, d, pickup) => {
      await donationModel.setStatus(conn, d.donation_id, 'picked_up');
      await pickupModel.markPickedUp(conn, pickup.pickup_id);
    },
  });
  await notifyParties(donation, 'status_change', {
    donor: `Donation #${donationId} was collected by ${donation.volunteer_name}. Thank you!`,
    ngo: `Donation #${donationId} is on its way. Have your delivery QR code ready.`,
  });
  return withTripDistances(donation, null);
}

async function confirmDelivery(userId, donationId, code) {
  let impact;
  const donation = await verifyHandover(userId, donationId, code, {
    expectedStatus: 'picked_up',
    hashColumn: 'delivery_code_hash',
    onVerified: async (conn, d, pickup) => {
      impact = computeImpact(d.quantity_kg);
      await donationModel.setStatus(conn, d.donation_id, 'delivered');
      await pickupModel.markDelivered(conn, pickup.pickup_id);
      await donationModel.recordImpact(conn, d.donation_id, impact);
    },
  });
  await notifyParties(donation, 'status_change', {
    donor: `Donation #${donationId} was delivered to ${donation.ngo_name}: about ${impact.mealsEquivalent} meals served and ${impact.co2SavedKg} kg of CO2e avoided.`,
    ngo: `Donation #${donationId} was delivered and verified.`,
  });
  return { ...withTripDistances(donation, null), impact };
}

module.exports = { listAvailable, listMine, claim, confirmPickup, confirmDelivery };
