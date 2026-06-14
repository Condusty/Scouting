import React, { useEffect, useRef, useState } from 'react';
import type { Rally, TeamSide } from '@shared/types';
import { cn } from '@renderer/lib/cn';
import { useScoutingStore } from '@renderer/store/scouting.store';

const TEAM_LABELS: Record<TeamSide, string> = {
  home: 'Heim',
  away: 'Gast',
};

export function RallyLog() {
  const rallies = useScoutingStore((s) => s.rallies);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [rallies.length]);

  if (rallies.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-3 py-6 text-xs text-zinc-500">
        Noch keine Ballwechsel erfasst.
      </div>
    );
  }

  return (
    <div className="flex max-h-full flex-col overflow-y-auto">
      {rallies.map((rally) => (
        <RallyRow
          key={rally.id}
          rally={rally}
          selected={selectedId === rally.id}
          onClick={() => setSelectedId((current) => (current === rally.id ? null : rally.id))}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function RallyRow({ rally, selected, onClick }: { rally: Rally; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 border-b border-zinc-800 px-3 py-1.5 text-left text-xs transition-colors',
        'hover:bg-zinc-800/60',
        selected ? 'bg-sky-500/10' : 'bg-transparent',
      )}
    >
      <span className="w-8 shrink-0 tabular-nums text-zinc-500">#{rally.rally_number}</span>
      <span className="flex-1 truncate font-mono text-zinc-200">{rally.raw_input}</span>
      <span className="w-12 shrink-0 text-right tabular-nums text-zinc-300">
        {rally.home_score_after} : {rally.away_score_after}
      </span>
      <span
        className={cn(
          'w-10 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wide',
          rally.point_team === 'home' && 'text-sky-400',
          rally.point_team === 'away' && 'text-amber-400',
          rally.point_team === null && 'text-transparent',
        )}
      >
        {rally.point_team !== null ? TEAM_LABELS[rally.point_team] : '—'}
      </span>
    </button>
  );
}
