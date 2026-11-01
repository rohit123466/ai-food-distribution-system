const { Router } = require('express');
const {
  create,
  listMine,
  retry,
  pickupCode,
  listIncoming,
  deliveryCode,
} = require('../controllers/donation.controller');
const { validateCreateDonation, validateIdParam } = require('../validators/donation.validator');
const { uploadDonationImage } = require('../middleware/upload.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

// Donor
router.post('/', authorize('donor'), uploadDonationImage, validateCreateDonation, create);
router.get('/mine', authorize('donor'), listMine);
router.post('/:id/retry', authorize('donor'), validateIdParam('id'), retry);
router.get('/:id/pickup-code', authorize('donor'), validateIdParam('id'), pickupCode);

// NGO
router.get('/incoming', authorize('ngo'), listIncoming);
router.get('/:id/delivery-code', authorize('ngo'), validateIdParam('id'), deliveryCode);

module.exports = router;
