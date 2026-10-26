import DownloadButton from './DownloadButton.jsx';

function formatSize(size) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'unit',
    unit: 'byte',
    unitDisplay: 'short',
    maximumFractionDigits: 1
  }).format(size);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(date));
}

export default function DocumentList({ documents, isLoading, error }) {
  if (isLoading && documents.length === 0) {
    return <p className="list-feedback">Carregando documentos...</p>;
  }

  if (!isLoading && documents.length === 0 && !error) {
    return (
      <div className="empty-state">
        <span className="empty-rule" aria-hidden="true" />
        <p>Nenhum documento por aqui.</p>
      </div>
    );
  }

  return (
    <div className="document-list-wrap">
      {error && <p className="list-error" role="alert">{error}</p>}
      {isLoading && documents.length > 0 && (
        <p className="list-feedback" role="status">Atualizando lista...</p>
      )}
      {documents.length > 0 && (
        <ul className="document-list">
          {documents.map((document) => (
            <li className="document-row" key={document.id}>
              <div className="document-info">
                <span className="document-type" aria-hidden="true">FILE</span>
                <div className="document-name-block">
                  <h3 title={document.originalName}>{document.originalName}</h3>
                  <p>{formatDate(document.uploadedAt)}</p>
                </div>
              </div>
              <span className="document-size">{formatSize(document.size)}</span>
              <DownloadButton document={document} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}