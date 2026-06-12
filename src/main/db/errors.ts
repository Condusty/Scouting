export interface DbErrorContext {
  entity: string;
  field?: string;
}

/** Übersetzt better-sqlite3 Constraint-Fehler in benutzerfreundliche Meldungen. */
export function mapDbError(e: unknown, ctx: DbErrorContext): never {
  const code = (e as { code?: string }).code;
  if (code === 'SQLITE_CONSTRAINT_UNIQUE') {
    throw new Error(`${ctx.entity}: „${ctx.field ?? 'Wert'}" existiert bereits.`);
  }
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    throw new Error(`${ctx.entity}: wird noch verwendet und kann nicht gelöscht werden.`);
  }
  throw e instanceof Error ? e : new Error(String(e));
}
