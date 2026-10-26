import { useState } from 'react';
import { uploadDocument } from '../services/apiClient.js';

export default function UploadComponent({ onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile || isUploading) {
      return;
    }

    const form = event.currentTarget;
    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      const document = await uploadDocument(selectedFile);
      setSuccess(`${document.originalName} enviado.`);
      setSelectedFile(null);
      form.reset();
      onUploaded();
    } catch (uploadError) {
      setError(uploadError.message || 'Não foi possível enviar o arquivo.');
    } finally {
      setIsUploading(false);
    }
  }

  function acceptDroppedFile(event) {
    event.preventDefault();
    setIsDragging(false);
    const [file] = event.dataTransfer.files;
    if (file) {
      setSelectedFile(file);
      setError('');
      setSuccess('');
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label
        className={`drop-zone${isDragging ? ' is-dragging' : ''}`}
        htmlFor="document-file"
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsDragging(false);
          }
        }}
        onDrop={acceptDroppedFile}
      >
        <input
          className="file-input"
          id="document-file"
          type="file"
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] || null);
            setError('');
            setSuccess('');
          }}
        />
        <span className="drop-mark" aria-hidden="true">+</span>
        <span className="drop-title">
          {selectedFile ? selectedFile.name : 'Escolha um arquivo'}
        </span>
        <span className="drop-hint">
          {selectedFile ? 'Clique para trocar ou solte outro arquivo' : 'ou arraste e solte aqui'}
        </span>
      </label>

      <div className="upload-actions">
        <span className="file-size-hint">Máximo de 10 MiB</span>
        <button className="primary-button" type="submit" disabled={!selectedFile || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar arquivo'}
        </button>
      </div>

      {error && <p className="form-message is-error" role="alert">{error}</p>}
      {success && <p className="form-message is-success" role="status">{success}</p>}
    </form>
  );
}