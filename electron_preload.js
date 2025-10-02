const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  initWhatsApp: () => ipcRenderer.invoke('init-whatsapp'),
  initWhatsAppBusiness: () => ipcRenderer.invoke('init-whatsapp-business'),
  initGmail: () => ipcRenderer.invoke('init-gmail'),
  getMessages: (filters) => ipcRenderer.invoke('get-messages', filters),
  sendMessage: (data) => ipcRenderer.invoke('send-message', data),
  
  // Listen for events
  onQRCode: (callback) => {
    ipcRenderer.on('whatsapp-qr', (event, data) => callback(data));
  },
  onReady: (callback) => {
    ipcRenderer.on('whatsapp-ready', (event, data) => callback(data));
  },
  onNewMessage: (callback) => {
    ipcRenderer.on('new-message', (event, data) => callback(data));
  },
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});