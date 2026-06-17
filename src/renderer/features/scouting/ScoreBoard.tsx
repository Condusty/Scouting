import React from 'react';
import { Circle, HelpCircle } from 'lucide-react';
import type { TeamSide } from '@shared/types';
import { cn } from '@renderer/lib/cn';
import { IconButton } from '@renderer/components/ui/Button';

export interface ScoreBoardProps {
  setNumber: number;
  homeScore: number;
  awayScore: number;
  servingTeam: TeamSide;
  homeTeamName: string;
  awayTeamName: string;
  onOpenHelp?: () => void;
}

function TeamScore({
  name,
  score,
  isServing,
  align,
}: {
  name: string;
  score: number;
  isServing: boolean;
  align: 'left' | 'right';
}) {
  return (
    <div
      className={cn(
        'flex flex-1 items-center gap-2 border-l-2 px-3 py-1.5',
        align === 'right' && 'flex-row-reverse text-right',
        isServing ? 'border-sky-400' : 'border-transparent'
      )}
    >
      {isServing && <Circle size={8} className="shrink-0 fill-sky-400 text-sky-400" />}
      <span
        className={cn(
          'truncate text-sm font-medium',
          isServing ? 'text-zinc-100' : 'text-zinc-400'
        )}
      >
        {name}
      </span>
      <span className="ml-auto text-2xl font-bold tabular-nums text-white">{score}</span>
    </div>
  );
}

export function ScoreBoard({
  setNumber,
  homeScore,
  awayScore,
  servingTeam,
  homeTeamName,
  awayTeamName,
  onOpenHelp,
}: ScoreBoardProps) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-700 bg-zinc-900 px-3">
      <span className="shrink-0 rounded bg-zinc-800 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-300">
        Satz {setNumber}
      </span>
      <TeamScore
        name={homeTeamName}
        score={homeScore}
        isServing={servingTeam === 'home'}
        align="left"
      />
      <span className="shrink-0 text-zinc-600">:</span>
      <TeamScore
        name={awayTeamName}
        score={awayScore}
        isServing={servingTeam === 'away'}
        align="right"
      />
      {onOpenHelp && (
        <IconButton onClick={onOpenHelp} aria-label="Notation-Referenz">
          <HelpCircle size={15} />
        </IconButton>
      )}
    </div>
  );
}
