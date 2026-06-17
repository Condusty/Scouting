import React, { useEffect, useRef, useState } from 'react';
import type { Rally } from '@shared/types';
import { cn } from '@renderer/lib/cn';
import { useScoutingStore } from '@renderer/store/scouting.store';
import { parseCode } from '@renderer/lib/code-parser';
import { validateRally } from '@renderer/lib/code-validator';
import { Input } from '@renderer/components/ui/Field';
import { describePendingRally, TEAM_LABELS } from '@renderer/features/scouting/rally-preview';

export function RallyLog() {
  const rallies = useScoutingStore((s) => s.rallies);
  const [editingId, setEditingId] = useState<number | null>(null);
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
      {rallies.map((rally) =>
        editingId === rally.id ? (
          <RallyEditRow key={rally.id} rally={rally} onClose={() => setEditingId(null)} />
        ) : (
          <RallyRow key={rally.id} rally={rally} onClick={() => setEditingId(rally.id)} />
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function RallyRow({ rally, onClick }: { rally: Rally; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-zinc-800 px-3 py-1.5 text-left text-xs transition-colors hover:bg-zinc-800/60"
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

function RallyEditRow({ rally, onClose }: { rally: Rally; onClose: () => void }) {
  const session = useScoutingStore((s) => s.session);
  const updateRally = useScoutingStore((s) => s.updateRally);
  const [value, setValue] = useState(rally.raw_input ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const parsed = parseCode(value);
  const errors = session !== null ? validateRally(parsed, session) : [];
  const previewParts = describePendingRally(parsed);
  const showNoMatch = value.length > 0 && previewParts.length === 0;

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      if (errors.length > 0) return;
      await updateRally(rally.id, value);
      onClose();
    }
  };

  return (
    <div className="flex flex-col gap-1 border-b border-zinc-800 bg-sky-500/10 px-3 py-1.5 text-xs">
      <div className="flex items-center gap-3">
        <span className="w-8 shrink-0 tabular-nums text-zinc-500">#{rally.rally_number}</span>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onClose}
          className="h-7 flex-1 font-mono"
        />
      </div>

      {value.length > 0 && (
        <div className="px-1 text-[11px] text-zinc-400">
          {showNoMatch ? (
            <span className="text-zinc-500">Kein gültiger Code</span>
          ) : (
            <span>{previewParts.join(' · ')}</span>
          )}
        </div>
      )}

      {errors.length > 0 && <div className="px-1 text-[11px] text-red-400">{errors[0].message}</div>}
    </div>
  );
}
