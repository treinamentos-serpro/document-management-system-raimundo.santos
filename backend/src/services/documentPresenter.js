function toPublicDocument(document) {
  const { id, originalName, size, uploadedAt, owner } = document;
  return { id, originalName, size, uploadedAt, owner };
}

function toPublicDocumentList(documents) {
  return documents
    .sort((left, right) => {
      const dateOrder = right.uploadedAt.localeCompare(left.uploadedAt);
      return dateOrder || left.id.localeCompare(right.id);
    })
    .map(toPublicDocument);
}

module.exports = {
  toPublicDocument,
  toPublicDocumentList
};