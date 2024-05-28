const { app, BrowserWindow, ipcMain } = require('electron/main')
const { spawn } = require('child_process')
const path = require('node:path')

let mainWindow;
let scribe;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
  console.log('window created');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  ipcMain.on('stop-transcribe', (event, args) => {
    console.log('Ending transcription...');
    if (scribe) scribe.kill();
  });

  ipcMain.on('start-transcribe', (event, args) => {
    console.log('Beginning transcription...');
    scribe = spawn('./scribe/scribe');

    scribe.on('error', (err) => {
      console.error("Transcriber process err: ", err);
    });

    scribe.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
      event.reply('process-output', data.toString());
    })

    scribe.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    scribe.on('close', (code) => {
      console.log(`transcriber process exited with code ${code}`);
    });
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
