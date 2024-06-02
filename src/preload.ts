// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('scribeApi', {
  // node: () => process.versions.node,
  // chrome: () => process.versions.chrome,
  // electron: () => process.versions.electron,
  startTranscribe: (args: any) => ipcRenderer.send('start-transcribe', args),
  stopTranscribe: (args: any) => ipcRenderer.send('stop-transcribe', args),
  onProcessOutput: (callback: any) => ipcRenderer.on('process-output', callback),
  // we can also expose variables, not just functions
})
