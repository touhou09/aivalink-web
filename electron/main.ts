import { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, shell } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

interface AgentNotificationPayload {
  title: string;
  body: string;
  eventId: string;
  eventType: string;
  characterName: string;
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let latestAgentNotification: AgentNotificationPayload | null = null;

function createTrayIcon() {
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGklEQVR4AWOAgQsu+P+PjY0NQYqBHY1KAwD5owQfGoVY6QAAAABJRU5ErkJggg==',
  );
}

function ensureTray(): Tray {
  if (tray) return tray;

  tray = new Tray(createTrayIcon());
  tray.setToolTip('AivaLink');
  tray.on('click', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.show();
    mainWindow?.focus();
  });
  updateTrayMenu();
  return tray;
}

function updateTrayMenu() {
  const statusLabel = latestAgentNotification
    ? `${latestAgentNotification.characterName}: ${latestAgentNotification.body}`
    : 'Agent activity idle';

  ensureTray().setContextMenu(Menu.buildFromTemplate([
    { label: statusLabel, enabled: false },
    { type: 'separator' },
    {
      label: 'Show AivaLink',
      click: () => {
        if (mainWindow?.isMinimized()) mainWindow.restore();
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { label: 'Quit', click: () => app.quit() },
  ]));
}

function handleAgentNotification(payload: AgentNotificationPayload) {
  latestAgentNotification = payload;
  updateTrayMenu();

  if (Notification.isSupported()) {
    new Notification({
      title: payload.title,
      body: payload.body,
    }).show();
  }

  return { ok: true };
}

function registerAgentIpcHandlers() {
  ipcMain.handle('agent:notify', (_event, payload: AgentNotificationPayload) => handleAgentNotification(payload));
  ipcMain.handle('agent:tray-status', () => ({
    ok: true,
    latest: latestAgentNotification,
  }));
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.aivalink');
  registerAgentIpcHandlers();
  ensureTray();

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
