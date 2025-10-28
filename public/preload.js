const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Manejadores de usuarios
  getUsers: () => ipcRenderer.invoke('users:get'),
  addUser: (userData) => ipcRenderer.invoke('users:add', userData),
  deleteUser: (userId) => ipcRenderer.invoke('users:delete', userId),

  // Función de impresión existente
  printSticker: (stickerData) => ipcRenderer.send('print-sticker', stickerData),

  // Copiar imagen local al portapapeles (desktop robusto)
  copyImageToClipboard: (imagePath) => ipcRenderer.invoke('copy-image-to-clipboard', imagePath),
});