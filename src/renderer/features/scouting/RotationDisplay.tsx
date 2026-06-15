import React from 'react';
import { cn } from '@renderer/lib/cn';

export interface RotationDisplayProps {
  homeLineup: number[]; // shirt numbers at positions 1-6, as entered at set start (rotation 1)
  awayLineup: number[];
  rotationHome: number; // current rotation, 1-6
  rotationAway: number;
}

const POSITIONS = [1, 2, 3, 4, 5, 6];

/**
 * Shirt number at court position `position` (1-6), given the set-start
 * `lineup` (rotation 1) and the team's `currentRotation`. Each rotation step
 * shifts every player by one position (P2->P1, ..., P1->P6).
 */
function shirtAtPosition(lineup: number[], currentRotation: number, position: number): number | null {
  if (lineup.length === 0) return null;
  const offset = ((currentRotation - 1) % 6 + 6) % 6;
  return lineup[(position - 1 + offset) % 6];
}

function RotationGrid({ label, lineup, rotation }: { label: string; lineup: number[]; rotation: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</h3>
      <div className="grid grid-cols-3 gap-1.5">
        {POSITIONS.map((pos) => {
          const shirt = shirtAtPosition(lineup, rotation, pos);
          const isCurrent = pos === 1;
          return (
            <div
              key={pos}
              className={cn(
                'flex flex-col items-center justify-center rounded border px-2 py-1.5',
                isCurrent ? 'border-sky-400 bg-sky-500/10' : 'border-zinc-700 bg-zinc-800/50'
              )}
            >
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">P{pos}</span>
              <span className={cn('text-lg font-bold tabular-nums', isCurrent ? 'text-sky-300' : 'text-zinc-200')}>
                {shirt ?? '–'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RotationDisplay({ homeLineup, awayLineup, rotationHome, rotationAway }: RotationDisplayProps) {
  return (
    <div className="grid grid-cols-2 gap-4 p-3">
      <RotationGrid label="Heim" lineup={homeLineup} rotation={rotationHome} />
      <RotationGrid label="Gast" lineup={awayLineup} rotation={rotationAway} />
    </div>
  );
}
