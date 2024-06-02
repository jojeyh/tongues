import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'child_process';
// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

declare global {
  interface Window {
    scribeApi?: any;
  }
}

let scribe: any;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();

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

    scribe.on('error', (err: any) => {
      console.error("Transcriber process err: ", err);
    });

    /*
      Message from socket is object with properties:
      { type: Buffer, data: ... }
    */
    scribe.stdout.on('data', (data: any) => {
      let data_string = data.toString();
      if (data_string.slice(0, 3) === "seg") {
        const trimmed_string = data_string.split('\n')[0]
        event.reply('process-output', trimmed_string.slice(3));
      }
    })

    scribe.stderr.on('data', (data: any) => {
      console.error(`stderr: ${data}`);
    });

    scribe.on('close', (code: any) => {
      console.log(`transcriber process exited with code ${code}`);
    });
  })
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
