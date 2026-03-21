import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Dev mode: load from vite dev server
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    // Production: load built files
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.aivalink');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
