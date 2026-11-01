const taskService = require('../services/task.service');
const asyncHandler = require('../utils/asyncHandler');

function parseLocation(query) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  if (query.lat === undefined || query.lng === undefined) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const listAvailable = asyncHandler(async (req, res) => {
  const tasks = await taskService.listAvailable(req.user.id, parseLocation(req.query));
  res.status(200).json({ tasks });
});

const listMine = asyncHandler(async (req, res) => {
  const tasks = await taskService.listMine(req.user.id);
  res.status(200).json({ tasks });
});

const claim = asyncHandler(async (req, res) => {
  const task = await taskService.claim(req.user.id, req.params.donationId);
  res.status(200).json({ message: 'Pickup claimed', task });
});

const pickup = asyncHandler(async (req, res) => {
  const task = await taskService.confirmPickup(req.user.id, req.params.donationId, req.body.code);
  res.status(200).json({ message: 'Pickup verified', task });
});

const deliver = asyncHandler(async (req, res) => {
  const task = await taskService.confirmDelivery(req.user.id, req.params.donationId, req.body.code);
  res.status(200).json({ message: 'Delivery verified', task });
});

module.exports = { listAvailable, listMine, claim, pickup, deliver };
