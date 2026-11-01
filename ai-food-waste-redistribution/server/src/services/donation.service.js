const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const env = require('../config/env');
const { withTransaction } = require('../config/db');
const donationModel = require('../models/donation.model');
const pickupModel = require('../models/pickup.model');
const configModel = require('../models/config.model');
const notificationModel = require('../models/notification.model');
const aiService = require('./ai.service');
const matchingService = require('./matching.service');
const { requireProfile } = require('./profile.service');
const { computeExpiry } = require('../utils/shelfLife.util');
const { generateCode, toQrDataUrl } = require('../utils/handoverCode.util');
const ApiError = require('../utils/ApiError');

const DONATION_IMAGE_DIR = path.join(env.uploadsDir, 'donations');
const MIME_EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

async function saveImage(file) {
  await fs.mkdir(DONATION_IMAGE_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}${MIME_EXTENSIONS[file.mimetype]}`;
  await fs.writeFile(path.join(DONATION_IMAGE_DIR, filename), file.buffer);
  return { filename, url: `/uploads/donations/${filename}` };
}

function imagePathFromUrl(imageUrl) {
  return path.join(DONATION_IMAGE_DIR, path.basename(imageUrl));
}

function mimeFromUrl(imageUrl) {
  const ext = path.extname(imageUrl).toLowerCase();
  return Object.keys(MIME_EXTENSIONS).find((mime) => MIME_EXTENSIONS[mime] === ext) || 'image/jpeg';
}

// Step 2 of the flow: score the photo, then (if fresh) step 3, matching.
// Safe to call again for a donation still "pending" (AI service was down).
async function runAiCheck(donationId) {
  const image = await donationModel.getFirstImage(donationId);
  const result = image && (await aiService.analyzeImage(imagePathFromUrl(image.image_url), mimeFromUrl(image.image_url)));
  if (!result) {
    return { aiChecked: false, matchedNgoCount: 0 };
  }

  const config = await configModel.getNumbers();
  const freshnessStatus = result.freshness_score >= config['freshness.fresh_min_score'] ? 'fresh' : 'spoiled';
  await donationModel.saveAiResult(donationId, image.image_id, {
    freshnessStatus,
    confidence: result.confidence,
    labels: {
      model: result.model,
      freshness_score: result.freshness_score,
      threshold: config['freshness.fresh_min_score'],
      signals: result.signals,
      labels: result.labels,
      warnings: result.warnings,
    },
  });

  const donation = await donationModel.findById(donationId);

  if (freshnessStatus === 'spoiled') {
    await notificationModel.create({
      userId: donation.donor_user_id,
      donationId,
      type: 'freshness',
      message: `Donation #${donationId} scored ${result.freshness_score}/100 on the freshness check (minimum ${config['freshness.fresh_min_score']}), so it won't be offered to NGOs.`,
    });
    return { aiChecked: true, matchedNgoCount: 0 };
  }

  const matchedNgoCount = await matchingService.recommendNgos(donation);
  await notificationModel.create({
    userId: donation.donor_user_id,
    donationId,
    type: 'match',
    message:
      matchedNgoCount > 0
        ? `Donation #${donationId} passed the freshness check and was offered to ${matchedNgoCount} nearby NGO(s).`
        : `Donation #${donationId} passed the freshness check, but no NGO within range accepts ${donation.diet_type.replace('_', '-')} food right now.`,
  });
  return { aiChecked: true, matchedNgoCount };
}

// Step 1: post. The donation row is committed before the AI call, so it exists
// (as freshness "pending") even if the AI service never answers.
async function createDonation(userId, fields, file) {
  const donor = await requireProfile('donor', userId);

  const expiryEstimate = computeExpiry(fields.preparedAt, fields.foodCategory, fields.storageCondition);
  if (expiryEstimate <= new Date()) {
    throw new ApiError(
      400,
      `This food passed its safe window at ${expiryEstimate.toLocaleString()} (based on its category and storage), so it can't be donated.`,
    );
  }

  const image = await saveImage(file);
  let donationId;
  try {
    donationId = await withTransaction(async (conn) => {
      const id = await donationModel.create(conn, { ...fields, donorId: donor.donor_id, expiryEstimate });
      await donationModel.addImage(conn, id, image.url);
      return id;
    });
  } catch (err) {
    await fs.unlink(path.join(DONATION_IMAGE_DIR, image.filename)).catch(() => {});
    throw err;
  }

  const outcome = await runAiCheck(donationId);
  const donation = await donationModel.findById(donationId);
  return { donation, ...outcome };
}

async function getOwnedDonation(donor, donationId) {
  const donation = await donationModel.findById(donationId);
  if (!donation || donation.donor_id !== donor.donor_id) {
    throw new ApiError(404, 'Donation not found');
  }
  return donation;
}

async function listForDonor(userId) {
  const donor = await requireProfile('donor', userId);
  const [donations, impact] = await Promise.all([
    donationModel.listByDonor(donor.donor_id),
    donationModel.getImpactTotalsForDonor(donor.donor_id),
  ]);
  return { donations, impact };
}

// Re-runs whichever automatic step a posted donation is stuck on: the AI check
// if the service was down, or matching if no NGO was in range last time.
async function retry(userId, donationId) {
  const donor = await requireProfile('donor', userId);
  const donation = await getOwnedDonation(donor, donationId);

  if (donation.status !== 'posted') {
    throw new ApiError(409, `Donation is already ${donation.status.replace('_', ' ')}`);
  }
  if (new Date(donation.expiry_estimate) <= new Date()) {
    throw new ApiError(409, 'Donation has passed its safe window');
  }

  let outcome;
  if (donation.freshness_status === 'pending') {
    outcome = await runAiCheck(donationId);
    if (!outcome.aiChecked) {
      throw new ApiError(503, 'The AI service is still unavailable. Try again in a minute.');
    }
  } else if (donation.freshness_status === 'fresh' && Number(donation.open_match_count) === 0) {
    const fresh = await donationModel.findById(donationId);
    outcome = { aiChecked: true, matchedNgoCount: await matchingService.recommendNgos(fresh) };
  } else {
    throw new ApiError(409, 'Nothing to retry: the donation is already waiting on NGO responses');
  }

  return { donation: await donationModel.findById(donationId), ...outcome };
}

// The donor shows this at pickup; the volunteer scans it (step 4).
async function getPickupCode(userId, donationId) {
  const donor = await requireProfile('donor', userId);
  const donation = await getOwnedDonation(donor, donationId);
  if (donation.status !== 'assigned') {
    throw new ApiError(409, 'A pickup code exists only while a volunteer is on the way to collect');
  }
  const pickup = await pickupModel.findByDonation(donationId);
  const code = generateCode('pickup', donationId, pickup.pickup_id);
  return { code, qr: await toQrDataUrl(code) };
}

async function listForNgo(userId) {
  const ngo = await requireProfile('ngo', userId);
  return donationModel.listByNgo(ngo.ngo_id);
}

// The NGO shows this when the food arrives; the volunteer scans it (step 5).
async function getDeliveryCode(userId, donationId) {
  const ngo = await requireProfile('ngo', userId);
  const donation = await donationModel.findById(donationId);
  if (!donation || donation.assigned_ngo_id !== ngo.ngo_id) {
    throw new ApiError(404, 'Donation not found');
  }
  if (!['assigned', 'picked_up'].includes(donation.status)) {
    throw new ApiError(409, 'A delivery code exists only once a volunteer has taken the delivery');
  }
  const pickup = await pickupModel.findByDonation(donationId);
  const code = generateCode('delivery', donationId, pickup.pickup_id);
  return { code, qr: await toQrDataUrl(code) };
}

module.exports = { createDonation, listForDonor, retry, getPickupCode, listForNgo, getDeliveryCode, runAiCheck };
