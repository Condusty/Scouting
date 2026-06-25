import React from 'react';
import { Button } from '@renderer/components/ui/Button';

export function BlockCountBar({ onPick }: { onPick: (n: 0 | 1 | 2) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="secondary" size="sm" onClick={() => onPick(0)}>
        0 — kein Block
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => onPick(1)}>
        1 Blockspieler
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => onPick(2)}>
        2 Blockspieler
      </Button>
    </div>
  );
}
