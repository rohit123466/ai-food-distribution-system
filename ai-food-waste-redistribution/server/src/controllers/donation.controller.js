const donationService = require('../services/donation.service');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const result = await donationService.createDonation(req.user.id, req.body, req.file);
  res.status(201).json(result);
});

const listMine = asyncHandler(async (req, res) => {
  const result = await donationService.listForDonor(req.user.id);
  res.status(200).json(result);
});

const retry = asyncHandler(async (req, res) => {
  const result = await donationService.retry(req.user.id, req.params.id);
  res.status(200).json(result);
});

const pickupCode = asyncHandler(async (req, res) => {
  const result = await donationService.getPickupCode(req.user.id, req.params.id);
  res.status(200).json(result);
});

const listIncoming = asyncHandler(async (req, res) => {
  const donations = await donationService.listForNgo(req.user.id);
  res.status(200).json({ donations });
});

const deliveryCode = asyncHandler(async (req, res) => {
  const result = await donationService.getDeliveryCode(req.user.id, req.params.id);
  res.status(200).json(result);
});

module.exports = { create, listMine, retry, pickupCode, listIncoming, deliveryCode };
