const { Router } = require('express');
const { list, markAllRead } = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', list);
router.post('/read-all', markAllRead);

module.exports = router;
