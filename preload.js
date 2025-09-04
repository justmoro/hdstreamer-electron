// preload.js
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  startServer: () => ipcRenderer.invoke('start-server'),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  listChannels: () => ipcRenderer.invoke('list-channels'),
  addChannel: (k,obj) => ipcRenderer.invoke('add-channel', k, obj),
  removeChannel: (k) => ipcRenderer.invoke('remove-channel', k),
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectLogo: () => ipcRenderer.invoke('select-logo'),
  startChannel: (k) => ipcRenderer.invoke('start-channel', k),
  stopChannel: (k) => ipcRenderer.invoke('stop-channel', k)
});
