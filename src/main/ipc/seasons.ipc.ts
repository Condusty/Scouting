import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { Season, CreateSeasonDTO } from '@shared/types';
import { getDb } from '../db/connection';

export function registerSeasonsIPC(): void {
  ipcMain.handle(IPC.SEASONS_LIST, (): Season[] => {
    return getDb()
      .prepare('SELECT * FROM seasons ORDER BY start_date DESC')
      .all() as Season[];
  });

  ipcMain.handle(IPC.SEASONS_CREATE, (_e, data: CreateSeasonDTO): Season => {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO seasons (name, code, start_date, end_date, default_video_dir)
      VALUES (@name, @code, @start_date, @end_date, @default_video_dir)
    `).run(data);
    return db.prepare('SELECT * FROM seasons WHERE id = ?').get(result.lastInsertRowid) as Season;
  });

  ipcMain.handle(IPC.SEASONS_UPDATE, (_e, data: Partial<Season> & { id: number }): Season => {
    const db = getDb();
    const { id, ...fields } = data;
    const sets = Object.keys(fields).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE seasons SET ${sets} WHERE id = @id`).run({ ...fields, id });
    return db.prepare('SELECT * FROM seasons WHERE id = ?').get(id) as Season;
  });

  ipcMain.handle(IPC.SEASONS_DELETE, (_e, { id }: { id: number }): void => {
    getDb().prepare('DELETE FROM seasons WHERE id = ?').run(id);
  });
}
