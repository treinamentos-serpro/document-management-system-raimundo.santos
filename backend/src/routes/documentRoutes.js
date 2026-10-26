const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');
const fileRepository = require('../repositories/fileRepository');

const router = express.Router();
const upload = multer({
  storage: fileRepository.storage,
  limits: { fileSize: fileRepository.maxFileSizeBytes, files: 1 }
});

function requireUserIdentity(req, res, next) {
  const userId = req.user?.id ?? req.get('X-User-Id');
  if (typeof userId !== 'string' || !userId.trim()) {
    return res.status(401).json({
      error: {
        code: 'USER_IDENTITY_REQUIRED',
        message: 'Identidade do usuário não informada.'
      }
    });
  }

  req.userId = userId.trim();
  return next();
}

router.post('/upload', requireUserIdentity, upload.single('file'), documentController.upload);
router.get('/documents', requireUserIdentity, documentController.list);
router.get('/documents/:id/download', requireUserIdentity, documentController.download);

module.exports = router;