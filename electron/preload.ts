import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

interface AgentNotificationPayload {
  title: string;
  body: string;
  eventId: string;
  eventType: string;
  characterName: string;
}

const api = {
  isElectron: true,
  agent: {
    notify: (payload: AgentNotificationPayload) => ipcRenderer.invoke('agent:notify', payload),
    getTrayStatus: () => ipcRenderer.invoke('agent:tray-status'),
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  (window as Window & { api?: typeof api }).api = api;
}
