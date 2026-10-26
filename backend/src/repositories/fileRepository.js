const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

const projectRoot = path.resolve(__dirname, '../../..');
const backendRoot = path.join(projectRoot, 'backend');
const configuredStorageDir = process.env.STORAGE_DIR || path.join(backendRoot, 'storage');
const storageDirectory = path.isAbsolute(configuredStorageDir)
  ? configuredStorageDir
  : path.resolve(projectRoot, configuredStorageDir);
const maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024);

if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

fs.mkdirSync(storageDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, storageDirectory);
  },
  filename(req, file, callback) {
    callback(null, randomUUID());
  }
});

function getStoredFilePath(filename) {
  if (typeof filename !== 'string' || path.basename(filename) !== filename) {
    return null;
  }

  return path.join(storageDirectory, filename);
}

async function findReadableFile(filename) {
  const filePath = getStoredFilePath(filename);
  if (!filePath) {
    return null;
  }

  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
    return filePath;
  } catch {
    return null;
  }
}

async function removeStoredFile(filename) {
  const filePath = getStoredFilePath(filename);
  if (!filePath) {
    return;
  }

  await fs.promises.rm(filePath, { force: true });
}

module.exports = {
  storage,
  maxFileSizeBytes,
  findReadableFile,
  removeStoredFile
};