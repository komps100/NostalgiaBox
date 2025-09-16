const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  togglePause: () => ipcRenderer.invoke('toggle-pause'),
  toggleAutoStart: () => ipcRenderer.invoke('toggle-auto-start'),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  manualStitch: () => ipcRenderer.invoke('manual-stitch'),
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (event, data) => callback(data));
  }
});