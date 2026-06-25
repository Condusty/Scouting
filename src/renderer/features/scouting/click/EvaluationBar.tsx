import React from 'react';
import type { Effect } from '@shared/types';
import { Button } from '@renderer/components/ui/Button';

const EFFECTS: { value: Effect; label: string }[] = [
  { value: '#', label: '#' },
  { value: '+', label: '+' },
  { value: '!', label: '!' },
  { value: '-', label: '-' },
  { value: '/', label: '/' },
  { value: '=', label: '=' },
];

export function EvaluationBar({ onPick, onSkip }: { onPick: (effect: Effect) => void; onSkip: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {EFFECTS.map((e) => (
        <Button key={e.value} type="button" variant="secondary" size="sm" onClick={() => onPick(e.value)}>
          {e.label}
        </Button>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
        Überspringen
      </Button>
    </div>
  );
}
