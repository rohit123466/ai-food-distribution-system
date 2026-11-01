const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { listAvailable, listMine, claim, pickup, deliver } = require('../controllers/task.controller');
const { validateHandoverCode, validateIdParam } = require('../validators/donation.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

// Handover codes are 8 characters, so guessing is already impractical; this
// stops anyone from even trying at scale.
const handoverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many code attempts. Try again later.' },
});

router.use(authenticate, authorize('volunteer'));

router.get('/available', listAvailable);
router.get('/mine', listMine);
router.post('/:donationId/claim', validateIdParam('donationId'), claim);
router.post('/:donationId/pickup', handoverLimiter, validateIdParam('donationId'), validateHandoverCode, pickup);
router.post('/:donationId/deliver', handoverLimiter, validateIdParam('donationId'), validateHandoverCode, deliver);

module.exports = router;
