import React from 'react';
import { Check } from 'lucide-react';
import type { ScoutingValidationError } from '@shared/types';

export interface ValidationErrorsProps {
  errors: ScoutingValidationError[];
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-emerald-400">
        <Check size={12} />
        <span>Eingabe gültig</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 px-3 py-1">
      {errors.map((error, idx) => (
        <div
          key={`${error.position}-${error.token}-${idx}`}
          className="flex items-center gap-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-400"
        >
          <span className="font-mono font-semibold">{error.token}</span>
          <span className="text-red-300">{error.message}</span>
        </div>
      ))}
    </div>
  );
}
