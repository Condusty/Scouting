import { ipcMain, type IpcMainInvokeEvent } from 'electron';

type Handler = (event: IpcMainInvokeEvent, ...args: any[]) => unknown;

/** Registriert einen IPC-Handler und reicht nur eine saubere Error-Message an den Renderer durch. */
export function handle(channel: string, fn: Handler): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await fn(event, ...args);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e));
    }
  });
}
