import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/apiClient.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadDocuments() {
      setIsLoading(true);
      setListError('');

      try {
        const nextDocuments = await listDocuments();
        if (isActive) {
          setDocuments(nextDocuments);
        }
      } catch (error) {
        if (isActive) {
          setListError(error.message || 'Não foi possível carregar os documentos.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();
    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  function refreshDocuments() {
    setRefreshKey((currentKey) => currentKey + 1);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DMS</span>
        </a>
        <span className="topbar-label">GESTÃO DE DOCUMENTOS</span>
      </header>

      <main className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ARQUIVO PESSOAL</p>
            <h1>Documentos</h1>
          </div>
          <span className="document-count" aria-live="polite">
            {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
          </span>
        </div>

        <div className="workspace">
          <section className="upload-section" aria-labelledby="upload-heading">
            <div className="section-heading">
              <span className="section-index">01</span>
              <h2 id="upload-heading">Enviar documento</h2>
            </div>
            <UploadComponent onUploaded={refreshDocuments} />
          </section>

          <section className="documents-section" aria-labelledby="documents-heading">
            <div className="section-heading documents-heading">
              <div className="section-title-group">
                <span className="section-index">02</span>
                <h2 id="documents-heading">Seus arquivos</h2>
              </div>
              <button className="text-button" type="button" onClick={refreshDocuments}>
                Atualizar lista
              </button>
            </div>
            <DocumentList
              documents={documents}
              isLoading={isLoading}
              error={listError}
            />
          </section>
        </div>
      </main>

      <footer className="page-footer">DMS <span>·</span> Armazenamento local</footer>
    </div>
  );
}