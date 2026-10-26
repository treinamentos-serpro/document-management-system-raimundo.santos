const API_PREFIX = '/api';
const USER_ID_STORAGE_KEY = 'dms.userId';
let inMemoryUserId;

function createLocalUserId() {
  return globalThis.crypto?.randomUUID?.()
    || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getUserId() {
  try {
    const storedUserId = window.localStorage.getItem(USER_ID_STORAGE_KEY);
    if (storedUserId) {
      return storedUserId;
    }

    inMemoryUserId = inMemoryUserId || createLocalUserId();
    window.localStorage.setItem(USER_ID_STORAGE_KEY, inMemoryUserId);
    return inMemoryUserId;
  } catch {
    inMemoryUserId = inMemoryUserId || createLocalUserId();
    return inMemoryUserId;
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('X-User-Id', getUserId());

  let response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, { ...options, headers });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }

  if (!response.ok) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    throw new Error(payload?.error?.message || 'Não foi possível concluir a solicitação.');
  }

  return response;
}

export async function listDocuments() {
  const response = await request('/documents');
  const payload = await response.json();
  return payload.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', {
    method: 'POST',
    body: formData
  });
  const payload = await response.json();
  return payload.document;
}

export async function downloadDocument(id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`);
  return response.blob();
}