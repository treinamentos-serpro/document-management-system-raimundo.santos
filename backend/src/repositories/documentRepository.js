const documents = new Map();

const documentRepository = {
  save(document) {
    documents.set(document.id, document);
    return document;
  },

  findById(id) {
    return documents.get(id) || null;
  },

  findByOwner(owner) {
    return [...documents.values()].filter((document) => document.owner === owner);
  }
};

module.exports = documentRepository;