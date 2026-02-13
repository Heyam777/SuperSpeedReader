import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { sanitizeTtsPayload, validateLibraryItem, validatePdfFilePath } from './ipc-validation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getLibraryPath() {
  return path.join(app.getPath('userData'), 'superspeedreader-library.json');
}

async function ensureLibraryFile() {
  try {
    await fs.access(getLibraryPath());
  } catch (_error) {
    await fs.writeFile(getLibraryPath(), '[]', 'utf-8');
  }
}

async function readLibrary() {
  await ensureLibraryFile();
  const raw = await fs.readFile(getLibraryPath(), 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return [];
  }
}

async function writeLibrary(items) {
  await fs.writeFile(getLibraryPath(), JSON.stringify(items, null, 2), 'utf-8');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#101418' : '#f4f6fb',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.env.SSR_DEBUG_TOOLS) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('app:getInfo', () => ({
  version: app.getVersion(),
  platform: process.platform,
  locale: app.getLocale(),
}));

ipcMain.handle('library:load', async () => {
  return readLibrary();
});

ipcMain.handle('library:save', async (_event, item) => {
  const validatedItem = validateLibraryItem(item);
  const library = await readLibrary();
  const filtered = library.filter((entry) => entry.id !== validatedItem.id);
  filtered.unshift({ ...validatedItem, updatedAt: Date.now() });
  const trimmed = filtered.slice(0, 12);
  await writeLibrary(trimmed);
  return trimmed;
});

ipcMain.handle('library:clear', async () => {
  await writeLibrary([]);
  return [];
});

ipcMain.handle('tts:speak', async (_event, payload) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set.');
  }
  const { text, voice, format, language } = sanitizeTtsPayload(payload);
  const filePath = path.join(app.getPath('userData'), `tts-${Date.now()}.${format}`);

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      input: text,
      voice,
      format,
      language,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenAI TTS failed (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);
  await fs.writeFile(filePath, audioBuffer);
  return { filePath };
});

ipcMain.handle('fs:readFile', async (_event, filePath) => {
  const safePath = validatePdfFilePath(filePath);
  const stats = await fs.stat(safePath);
  if (stats.size > 100 * 1024 * 1024) {
    throw new Error('PDF is too large. Maximum supported size is 100MB.');
  }
  const data = await fs.readFile(safePath);
  return Array.from(data);
});
