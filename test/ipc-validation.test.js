import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeTtsPayload, validateLibraryItem, validatePdfFilePath } from '../ipc-validation.js';

test('validateLibraryItem trims and accepts valid payload', () => {
  const item = validateLibraryItem({
    id: '  doc-123  ',
    name: '  My PDF Notes  ',
    text: 'Body',
  });

  assert.equal(item.id, 'doc-123');
  assert.equal(item.name, 'My PDF Notes');
});

test('validateLibraryItem rejects invalid payload', () => {
  assert.throws(() => validateLibraryItem(null), /Invalid library payload/);
  assert.throws(() => validateLibraryItem({ id: 'x', name: 'ok' }), /id is invalid/);
  assert.throws(() => validateLibraryItem({ id: 'valid-id', name: '' }), /name is invalid/);
});

test('sanitizeTtsPayload normalizes values and applies defaults', () => {
  const payload = sanitizeTtsPayload({
    text: '  hello   world  ',
    voice: 'invalid-voice',
    format: 'invalid-format',
    language: 'pl',
  });

  assert.equal(payload.text, 'hello world');
  assert.equal(payload.voice, 'alloy');
  assert.equal(payload.format, 'mp3');
  assert.equal(payload.language, 'pl');
});

test('sanitizeTtsPayload enforces required text', () => {
  assert.throws(() => sanitizeTtsPayload({}), /Missing text/);
  assert.throws(() => sanitizeTtsPayload({ text: '   ' }), /Missing text/);
});

test('validatePdfFilePath only allows pdf files', () => {
  assert.match(validatePdfFilePath('/tmp/my-file.PDF'), /my-file\.PDF$/);
  assert.throws(() => validatePdfFilePath('/tmp/notes.txt'), /Only PDF files are supported/);
});
