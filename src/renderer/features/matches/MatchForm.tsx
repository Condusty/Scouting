import React from 'react';
import type { MatchDetail, CreateMatchDTO, TeamRecord } from '@shared/types';
import { Field, Input, Textarea, Select } from '@renderer/components/ui/Field';
import { Button } from '@renderer/components/ui/Button';

export interface MatchFormValues extends CreateMatchDTO {}

export function emptyMatch(): MatchFormValues {
  return {
    season_id: null,
    home_team_id: 0,
    away_team_id: 0,
    match_date: null,
    venue: null,
    video_path: null,
    video_offset_ms: 0,
    comment: null,
    dvw_source_file: null,
    scouting_mode: 'code',
  };
}

export function matchToForm(m: MatchDetail): MatchFormValues {
  return {
    season_id: m.season_id,
    home_team_id: m.home_team_id,
    away_team_id: m.away_team_id,
    match_date: m.match_date,
    venue: m.venue,
    video_path: m.video_path,
    video_offset_ms: m.video_offset_ms,
    comment: m.comment,
    dvw_source_file: m.dvw_source_file,
    scouting_mode: m.scouting_mode,
  };
}

export function MatchForm({
  values,
  teams,
  onChange,
  modeLocked,
}: {
  values: MatchFormValues;
  teams: TeamRecord[];
  onChange: (v: MatchFormValues) => void;
  modeLocked?: boolean;
}) {
  const set = (patch: Partial<MatchFormValues>) => onChange({ ...values, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Heimteam" required>
          <Select value={values.home_team_id || ''} onChange={(e) => set({ home_team_id: Number(e.target.value) })}>
            <option value="">Auswählen…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gastteam" required>
          <Select value={values.away_team_id || ''} onChange={(e) => set({ away_team_id: Number(e.target.value) })}>
            <option value="">Auswählen…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Datum">
          <Input type="date" value={values.match_date ?? ''} onChange={(e) => set({ match_date: e.target.value || null })} />
        </Field>
        <Field label="Halle">
          <Input value={values.venue ?? ''} onChange={(e) => set({ venue: e.target.value || null })} />
        </Field>
      </div>
      <Field label="Scouting-Modus" required>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={values.scouting_mode === 'code' ? 'primary' : 'secondary'}
            disabled={modeLocked}
            onClick={() => set({ scouting_mode: 'code' })}
          >
            Code-Scouting
          </Button>
          <Button
            type="button"
            variant={values.scouting_mode === 'click' ? 'primary' : 'secondary'}
            disabled={modeLocked}
            onClick={() => set({ scouting_mode: 'click' })}
          >
            Click &amp; Scout
          </Button>
        </div>
        {modeLocked && (
          <p className="mt-1 text-xs text-zinc-500">Modus kann nach Anlage nicht mehr geändert werden.</p>
        )}
      </Field>
      <Field label="Kommentar">
        <Textarea value={values.comment ?? ''} onChange={(e) => set({ comment: e.target.value || null })} />
      </Field>
    </div>
  );
}
