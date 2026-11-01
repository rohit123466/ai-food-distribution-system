const { Router } = require('express');
const { listOpen, accept, reject } = require('../controllers/match.controller');
const { validateIdParam } = require('../validators/donation.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate, authorize('ngo'));

router.get('/', listOpen);
router.post('/:id/accept', validateIdParam('id'), accept);
router.post('/:id/reject', validateIdParam('id'), reject);

module.exports = router;
