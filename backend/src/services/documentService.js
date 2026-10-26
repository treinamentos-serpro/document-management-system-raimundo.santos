const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');
const fileRepository = require('../repositories/fileRepository');
const { toPublicDocument, toPublicDocumentList } = require('./documentPresenter');

class DocumentServiceError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function documentNotFoundError() {
  return new DocumentServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
}

const documentService = {
  async createDocument(file, owner) {
    if (!file) {
      throw new DocumentServiceError(400, 'FILE_REQUIRED', "Envie um arquivo no campo 'file'.");
    }

    const document = {
      id: randomUUID(),
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner,
      storageName: file.filename
    };

    try {
      documentRepository.save(document);
    } catch (error) {
      await fileRepository.removeStoredFile(file.filename).catch(() => {});
      throw error;
    }

    return toPublicDocument(document);
  },

  listDocuments(owner) {
    return toPublicDocumentList(documentRepository.findByOwner(owner));
  },

  async getDownload(owner, id) {
    const document = documentRepository.findById(id);
    if (!document || document.owner !== owner) {
      throw documentNotFoundError();
    }

    const filePath = await fileRepository.findReadableFile(document.storageName);
    if (!filePath) {
      throw documentNotFoundError();
    }

    return {
      filePath,
      originalName: document.originalName
    };
  }
};

module.exports = {
  documentService,
  DocumentServiceError
};