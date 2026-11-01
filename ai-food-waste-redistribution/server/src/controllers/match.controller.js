const matchService = require('../services/match.service');
const asyncHandler = require('../utils/asyncHandler');

const listOpen = asyncHandler(async (req, res) => {
  const matches = await matchService.listOpen(req.user.id);
  res.status(200).json({ matches });
});

const accept = asyncHandler(async (req, res) => {
  const donation = await matchService.accept(req.user.id, req.params.id);
  res.status(200).json({ message: 'Donation accepted', donation });
});

const reject = asyncHandler(async (req, res) => {
  await matchService.reject(req.user.id, req.params.id);
  res.status(200).json({ message: 'Donation declined' });
});

module.exports = { listOpen, accept, reject };
