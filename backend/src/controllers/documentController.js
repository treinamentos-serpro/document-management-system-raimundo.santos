const { documentService } = require('../services/documentService');

function sanitizeDownloadName(originalName) {
  const filename = originalName.split(/[\\/]/).pop();
  const safeFilename = filename.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return safeFilename || 'document';
}

const documentController = {
  async upload(req, res) {
    const document = await documentService.createDocument(req.file, req.userId);
    return res.status(201).json({ document });
  },

  list(req, res) {
    return res.status(200).json({
      documents: documentService.listDocuments(req.userId)
    });
  },

  async download(req, res, next) {
    const download = await documentService.getDownload(req.userId, req.params.id);
    return res.download(
      download.filePath,
      sanitizeDownloadName(download.originalName),
      (error) => {
        if (!error) {
          return;
        }

        if (error.code === 'ENOENT' && !res.headersSent) {
          return res.status(404).json({
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Documento não encontrado.'
            }
          });
        }

        return next(error);
      }
    );
  }
};

module.exports = documentController;