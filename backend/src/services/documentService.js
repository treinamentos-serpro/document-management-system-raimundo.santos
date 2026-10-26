const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');
const fileRepository = require('../repositories/fileRepository');

class DocumentServiceError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function toPublicDocument(document) {
  const { id, originalName, size, uploadedAt, owner } = document;
  return { id, originalName, size, uploadedAt, owner };
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
    return documentRepository
      .findByOwner(owner)
      .sort((left, right) => {
        const dateOrder = right.uploadedAt.localeCompare(left.uploadedAt);
        return dateOrder || left.id.localeCompare(right.id);
      })
      .map(toPublicDocument);
  },

  async getDownload(owner, id) {
    const document = documentRepository.findById(id);
    if (!document || document.owner !== owner) {
      throw new DocumentServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }

    const filePath = await fileRepository.findReadableFile(document.storageName);
    if (!filePath) {
      throw new DocumentServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
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