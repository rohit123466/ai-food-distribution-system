const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const donationRoutes = require('./donation.routes');
const matchRoutes = require('./match.routes');
const taskRoutes = require('./task.routes');
const notificationRoutes = require('./notification.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/donations', donationRoutes);
router.use('/matches', matchRoutes);
router.use('/tasks', taskRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
