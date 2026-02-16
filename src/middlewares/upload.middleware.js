const multer = require('multer');
const { env } = require('../config/env');

const storage = multer.memoryStorage();

function imageFileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Type de fichier non supporté'), false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_SIZE },
  fileFilter: imageFileFilter
});

module.exports = { upload };

