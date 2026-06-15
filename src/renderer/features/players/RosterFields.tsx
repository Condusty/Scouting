import React from 'react';
import type { TeamPlayer } from '@shared/types';
import { Field, Input } from '@renderer/components/ui/Field';

export interface RosterFieldsValues {
  shirt_number: number | null;
  is_libero: boolean;
  is_setter: boolean;
}

export function emptyRosterFields(): RosterFieldsValues {
  return { shirt_number: null, is_libero: false, is_setter: false };
}

export function rosterFieldsFromTeamPlayer(tp: TeamPlayer): RosterFieldsValues {
  return { shirt_number: tp.shirt_number, is_libero: tp.is_libero, is_setter: tp.is_setter };
}

export function RosterFields({
  values,
  onChange,
}: {
  values: RosterFieldsValues;
  onChange: (v: RosterFieldsValues) => void;
}) {
  const set = (patch: Partial<RosterFieldsValues>) => onChange({ ...values, ...patch });
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Trikotnummer" required>
        <Input
          type="number"
          value={values.shirt_number ?? ''}
          onChange={(e) => set({ shirt_number: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </Field>
      <Field label="Libero">
        <label className="flex h-9 items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={values.is_libero} onChange={(e) => set({ is_libero: e.target.checked })} className="h-4 w-4 accent-sky-500" />
          Libero
        </label>
      </Field>
      <Field label="Setter">
        <label className="flex h-9 items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={values.is_setter} onChange={(e) => set({ is_setter: e.target.checked })} className="h-4 w-4 accent-sky-500" />
          Setter
        </label>
      </Field>
    </div>
  );
}
