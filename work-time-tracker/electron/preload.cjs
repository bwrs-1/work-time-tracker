const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveData: (key, data, isRaw = false) => ipcRenderer.invoke('save-data', { key, data, isRaw }),
    loadData: (key) => ipcRenderer.invoke('load-data', key)
});
