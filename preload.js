import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  loadLibrary: () => ipcRenderer.invoke('library:load'),
  saveLibraryItem: (item) => ipcRenderer.invoke('library:save', item),
  clearLibrary: () => ipcRenderer.invoke('library:clear'),
  speakText: (payload) => ipcRenderer.invoke('tts:speak', payload),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
});

contextBridge.exposeInMainWorld('platform', process.platform);
