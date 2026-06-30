import React from 'react';
import { Button } from '@renderer/components/ui/Button';

const SERVE_TYPES: { value: string; label: string }[] = [
  { value: 'H', label: 'H — Flatter' },
  { value: 'M', label: 'M — Sprungflatter' },
  { value: 'Q', label: 'Q — Sprung' },
];

export function ServeTypeBar({ onPick }: { onPick: (subtype: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {SERVE_TYPES.map((t) => (
        <Button key={t.value} type="button" variant="secondary" size="lg" onClick={() => onPick(t.value)}>
          {t.label}
        </Button>
      ))}
    </div>
  );
}
