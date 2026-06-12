import React from 'react';
import type { Season, CreateSeasonDTO } from '@shared/types';
import { Field, Input } from '@renderer/components/ui/Field';

export interface SeasonFormValues extends CreateSeasonDTO {}

export function emptySeason(): SeasonFormValues {
  return { name: '', code: '', start_date: null, end_date: null, default_video_dir: null };
}

export function seasonToForm(s: Season): SeasonFormValues {
  return {
    name: s.name,
    code: s.code,
    start_date: s.start_date,
    end_date: s.end_date,
    default_video_dir: s.default_video_dir,
  };
}

export function SeasonForm({
  values,
  onChange,
}: {
  values: SeasonFormValues;
  onChange: (v: SeasonFormValues) => void;
}) {
  const set = (patch: Partial<SeasonFormValues>) => onChange({ ...values, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <Field label="Name" required>
        <Input value={values.name} onChange={(e) => set({ name: e.target.value })} placeholder="Saison 2024/25" />
      </Field>
      <Field label="Code" required>
        <Input value={values.code} onChange={(e) => set({ code: e.target.value })} placeholder="2024-25" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <Input type="date" value={values.start_date ?? ''} onChange={(e) => set({ start_date: e.target.value || null })} />
        </Field>
        <Field label="Ende">
          <Input type="date" value={values.end_date ?? ''} onChange={(e) => set({ end_date: e.target.value || null })} />
        </Field>
      </div>
    </div>
  );
}
