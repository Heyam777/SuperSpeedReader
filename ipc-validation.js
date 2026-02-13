import path from 'node:path';

const ALLOWED_TTS_FORMATS = new Set(['mp3', 'wav', 'opus', 'flac', 'pcm16']);
const ALLOWED_TTS_VOICES = new Set([
  'alloy',
  'aria',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'sol',
  'verse',
]);

export function validateLibraryItem(item) {
  if (!item || typeof item !== 'object') {
    throw new Error('Invalid library payload.');
  }

  if (typeof item.id !== 'string' || item.id.trim().length < 3 || item.id.trim().length > 120) {
    throw new Error('Library item id is invalid.');
  }

  if (
    typeof item.name !== 'string' ||
    item.name.trim().length < 1 ||
    item.name.trim().length > 280
  ) {
    throw new Error('Library item name is invalid.');
  }

  const normalized = {
    ...item,
    id: item.id.trim(),
    name: item.name.trim(),
  };

  const serialized = JSON.stringify(normalized);
  if (!serialized || serialized.length > 2_000_000) {
    throw new Error('Library item is too large.');
  }

  return normalized;
}

export function sanitizeTtsPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid TTS payload.');
  }
  if (!payload.text || typeof payload.text !== 'string') {
    throw new Error('Missing text to synthesise.');
  }

  const trimmed = payload.text.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    throw new Error('Missing text to synthesise.');
  }

  const voice =
    typeof payload.voice === 'string' && ALLOWED_TTS_VOICES.has(payload.voice)
      ? payload.voice
      : 'alloy';
  const format =
    typeof payload.format === 'string' && ALLOWED_TTS_FORMATS.has(payload.format)
      ? payload.format
      : 'mp3';
  const language =
    typeof payload.language === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(payload.language)
      ? payload.language
      : 'en';

  return {
    text: trimmed.slice(0, 4000),
    voice,
    format,
    language,
  };
}

export function validatePdfFilePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('No file path supplied.');
  }
  if (filePath.includes('\0')) {
    throw new Error('Invalid file path supplied.');
  }

  const resolved = path.resolve(filePath);
  if (path.extname(resolved).toLowerCase() !== '.pdf') {
    throw new Error('Only PDF files are supported.');
  }
  return resolved;
}
