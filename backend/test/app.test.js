const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '32';

const app = require('../src/app');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  fs.rmSync(storageDirectory, { recursive: true, force: true });
});

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download respeitam a propriedade do documento', async () => {
  const owner = `user-${randomUUID()}`;
  const form = new FormData();
  form.append('file', new Blob(['conteudo de teste']), 'relatorio.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: form
  });
  assert.strictEqual(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.strictEqual(document.originalName, 'relatorio.txt');
  assert.strictEqual(document.size, 17);
  assert.strictEqual(document.owner, owner);

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': owner }
  });
  assert.deepStrictEqual((await listResponse.json()).documents, [document]);

  const otherUserList = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': `user-${randomUUID()}` }
  });
  assert.deepStrictEqual((await otherUserList.json()).documents, []);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': owner }
  });
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');

  const forbiddenDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': `user-${randomUUID()}` }
  });
  assert.strictEqual(forbiddenDownload.status, 404);
  assert.strictEqual((await forbiddenDownload.json()).error.code, 'DOCUMENT_NOT_FOUND');
});

test('operações sem identidade e uploads inválidos retornam erros documentados', async () => {
  const unauthorizedResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(unauthorizedResponse.status, 401);
  assert.strictEqual((await unauthorizedResponse.json()).error.code, 'USER_IDENTITY_REQUIRED');

  const missingFileForm = new FormData();
  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': `user-${randomUUID()}` },
    body: missingFileForm
  });
  assert.strictEqual(missingFileResponse.status, 400);
  assert.strictEqual((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['x'.repeat(33)]), 'grande.txt');
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': `user-${randomUUID()}` },
    body: oversizedForm
  });
  assert.strictEqual(oversizedResponse.status, 413);
  assert.strictEqual((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');
});
