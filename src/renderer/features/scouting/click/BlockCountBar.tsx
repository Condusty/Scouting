import React from 'react';
import { Button } from '@renderer/components/ui/Button';

export function BlockCountBar({ onPick }: { onPick: (n: 1 | 2) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-zinc-500">Blockspieler:</span>
      <Button type="button" variant="secondary" size="sm" onClick={() => onPick(1)}>
        1
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => onPick(2)}>
        2
      </Button>
    </div>
  );
}
