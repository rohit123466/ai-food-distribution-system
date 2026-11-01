const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Kept in memory, not written to disk here: the file is only saved once the
// rest of the form has passed validation (see donation.service saveImage), so a
// rejected request never leaves an orphaned photo behind.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(400, 'image must be a JPEG, PNG or WebP file'));
    }
    cb(null, true);
  },
});

function uploadDonationImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'image must be 5 MB or smaller' : err.message;
      return next(new ApiError(400, message));
    }
    next(err);
  });
}

module.exports = { uploadDonationImage };
