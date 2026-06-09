import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ipc', {
  invoke: <T>(channel: string, data?: unknown): Promise<T> =>
    ipcRenderer.invoke(channel, data),
});

declare global {
  interface Window {
    ipc: {
      invoke: <T>(channel: string, data?: unknown) => Promise<T>;
    };
  }
}
