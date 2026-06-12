import React from 'react';
import type { Player, CreatePlayerDTO, Position } from '@shared/types';
import { Field, Input, Select } from '@renderer/components/ui/Field';

export interface PlayerFormValues extends CreatePlayerDTO {}

const POSITIONS: Position[] = ['OH', 'MB', 'OPP', 'S', 'L', 'DS'];

export function emptyPlayer(): PlayerFormValues {
  return {
    code: '',
    first_name: '',
    last_name: '',
    position: null,
    height_cm: null,
    weight_kg: null,
    reach_cm: null,
    photo_path: null,
  };
}

export function playerToForm(p: Player): PlayerFormValues {
  return {
    code: p.code,
    first_name: p.first_name,
    last_name: p.last_name,
    position: p.position,
    height_cm: p.height_cm,
    weight_kg: p.weight_kg,
    reach_cm: p.reach_cm,
    photo_path: p.photo_path,
  };
}

const numOrNull = (v: string): number | null => (v === '' ? null : Number(v));

export function PlayerForm({
  values,
  onChange,
}: {
  values: PlayerFormValues;
  onChange: (v: PlayerFormValues) => void;
}) {
  const set = (patch: Partial<PlayerFormValues>) => onChange({ ...values, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vorname" required>
          <Input value={values.first_name} onChange={(e) => set({ first_name: e.target.value })} />
        </Field>
        <Field label="Nachname" required>
          <Input value={values.last_name} onChange={(e) => set({ last_name: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code" required>
          <Input value={values.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="SMI-JOH" />
        </Field>
        <Field label="Position">
          <Select
            value={values.position ?? ''}
            onChange={(e) => set({ position: (e.target.value || null) as Position | null })}
          >
            <option value="">—</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Größe (cm)">
          <Input type="number" value={values.height_cm ?? ''} onChange={(e) => set({ height_cm: numOrNull(e.target.value) })} />
        </Field>
        <Field label="Gewicht (kg)">
          <Input type="number" value={values.weight_kg ?? ''} onChange={(e) => set({ weight_kg: numOrNull(e.target.value) })} />
        </Field>
        <Field label="Reichweite (cm)">
          <Input type="number" value={values.reach_cm ?? ''} onChange={(e) => set({ reach_cm: numOrNull(e.target.value) })} />
        </Field>
      </div>
    </div>
  );
}
