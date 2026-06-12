import React from 'react';
import type { TeamRecord, CreateTeamDTO } from '@shared/types';
import { Field, Input } from '@renderer/components/ui/Field';

export interface TeamFormValues extends CreateTeamDTO {}

export function emptyTeam(): TeamFormValues {
  return { name: '', code: '', coach: null };
}

export function teamToForm(t: TeamRecord): TeamFormValues {
  return { name: t.name, code: t.code, coach: t.coach };
}

export function TeamForm({
  values,
  onChange,
}: {
  values: TeamFormValues;
  onChange: (v: TeamFormValues) => void;
}) {
  const set = (patch: Partial<TeamFormValues>) => onChange({ ...values, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <Field label="Name" required>
        <Input value={values.name} onChange={(e) => set({ name: e.target.value })} placeholder="VC Beispielstadt" />
      </Field>
      <Field label="Code" required>
        <Input
          value={values.code}
          maxLength={3}
          onChange={(e) => set({ code: e.target.value.toUpperCase() })}
          placeholder="VCB"
        />
      </Field>
      <Field label="Trainer">
        <Input value={values.coach ?? ''} onChange={(e) => set({ coach: e.target.value || null })} />
      </Field>
    </div>
  );
}
