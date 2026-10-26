const express = require('express');
const multer = require('multer');
const documentRoutes = require('./routes/documentRoutes');
const { DocumentServiceError } = require('./services/documentService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Endpoint de verificação de saúde. As demais rotas (/upload, /documents,
// /documents/:id/download) serão implementadas durante o Passo 2.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', documentRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'O arquivo excede o tamanho máximo permitido.'
        }
      });
    }

    return res.status(400).json({
      error: {
        code: 'INVALID_FILE',
        message: 'A requisição de arquivo é inválida.'
      }
    });
  }

  if (error instanceof DocumentServiceError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  if (error.status === 400 || error.statusCode === 400) {
    return res.status(400).json({
      error: {
        code: 'INVALID_FILE',
        message: 'A requisição de arquivo é inválida.'
      }
    });
  }

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ocorreu um erro interno.'
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
