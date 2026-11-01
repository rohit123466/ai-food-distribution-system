const notificationModel = require('../models/notification.model');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const notifications = await notificationModel.listForUser(req.user.id);
  res.status(200).json({ notifications });
});

const markAllRead = asyncHandler(async (req, res) => {
  await notificationModel.markAllRead(req.user.id);
  res.status(200).json({ message: 'All notifications marked as read' });
});

module.exports = { list, markAllRead };
