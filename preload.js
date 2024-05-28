const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('scribeApi', {
  // node: () => process.versions.node,
  // chrome: () => process.versions.chrome,
  // electron: () => process.versions.electron,
  startTranscribe: (args) => ipcRenderer.send('start-transcribe', args),
  stopTranscribe: (args) => ipcRenderer.send('stop-transcribe', args),
  onProcessOutput: (callback) => ipcRenderer.on('process-output', callback),
  // we can also expose variables, not just functions
})
