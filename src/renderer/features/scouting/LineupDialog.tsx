import React from 'react';
import { RotateCcw, RotateCw, ClipboardList } from 'lucide-react';
import type { TeamPlayer, LineupSelection, TeamSide } from '@shared/types';
import { Dialog } from '@renderer/components/ui/Dialog';
import { Field } from '@renderer/components/ui/Field';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { cn } from '@renderer/lib/cn';

export interface LineupDialogProps {
  open: boolean;
  homeRoster: TeamPlayer[];
  awayRoster: TeamPlayer[];
  previousHomeLineup?: number[];
  previousAwayLineup?: number[];
  onConfirm: (selection: LineupSelection) => void;
  onCancel: () => void;
}

// Display order: net at top (4-3-2), back row below (5-6-1). Index = position - 1.
const GRID_POSITIONS = [4, 3, 2, 5, 6, 1];

function SetterBadge() {
  return (
    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500/20 px-1 text-[9px] font-semibold text-sky-300">
      S
    </span>
  );
}

function LiberoBadge() {
  return (
    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[9px] font-semibold text-amber-300">
      L
    </span>
  );
}

function rotateForward(lineup: (number | null)[]): (number | null)[] {
  return [...lineup.slice(1), lineup[0]];
}

function rotateBackward(lineup: (number | null)[]): (number | null)[] {
  return [lineup[lineup.length - 1], ...lineup.slice(0, -1)];
}

function LineupColumn({
  label,
  roster,
  lineup,
  onPlace,
  onClear,
  onRotateForward,
  onRotateBackward,
}: {
  label: string;
  roster: TeamPlayer[];
  lineup: (number | null)[];
  onPlace: (position: number, shirt: number) => void;
  onClear: (position: number) => void;
  onRotateForward: () => void;
  onRotateBackward: () => void;
}) {
  const placed = new Set(lineup.filter((v): v is number => v !== null));
  const bench = roster.filter((p) => !placed.has(p.shirt_number));

  const handleDrop = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    const shirt = Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(shirt)) onPlace(position, shirt);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-zinc-200">{label}</h3>
      <div>
        <span className="mb-1.5 block text-xs font-medium text-zinc-400">Kader</span>
        <div className="flex min-h-9 flex-wrap gap-1.5">
          {bench.map((p) => (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(p.shirt_number))}
              className="flex cursor-grab items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 active:cursor-grabbing"
            >
              <span className="font-semibold">#{p.shirt_number}</span> {p.last_name}
              {p.is_setter && <SetterBadge />}
              {p.is_libero && <LiberoBadge />}
            </div>
          ))}
          {bench.length === 0 && <span className="text-xs text-zinc-500">—</span>}
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <IconButton onClick={onRotateBackward} aria-label="Rotation zurück" title="Eine Rotation zurück">
            <RotateCcw size={13} />
          </IconButton>
          <span className="flex-1 text-center text-[10px] uppercase tracking-wide text-zinc-500">
            Netz ────────────
          </span>
          <IconButton onClick={onRotateForward} aria-label="Rotation vor" title="Eine Rotation vor">
            <RotateCw size={13} />
          </IconButton>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {GRID_POSITIONS.map((pos) => {
            const shirt = lineup[pos - 1];
            const player = roster.find((p) => p.shirt_number === shirt);
            return (
              <div
                key={pos}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, pos)}
                onClick={() => player && onClear(pos)}
                className={cn(
                  'flex h-16 flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-center',
                  player
                    ? 'cursor-pointer border-sky-500/60 bg-sky-500/10'
                    : 'border-dashed border-zinc-700 bg-zinc-800/40'
                )}
              >
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">Position {pos}</span>
                {player ? (
                  <span className="text-sm font-semibold text-zinc-100">
                    #{player.shirt_number} {player.last_name}
                    {player.is_setter && <SetterBadge />}
                    {player.is_libero && <LiberoBadge />}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">leer</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LineupDialog({ open, homeRoster, awayRoster, previousHomeLineup, previousAwayLineup, onConfirm, onCancel }: LineupDialogProps) {
  const [homeLineup, setHomeLineup] = React.useState<(number | null)[]>(Array(6).fill(null));
  const [awayLineup, setAwayLineup] = React.useState<(number | null)[]>(Array(6).fill(null));
  const [servingTeam, setServingTeam] = React.useState<TeamSide | null>(null);

  const hasPrevious = previousHomeLineup !== undefined && previousAwayLineup !== undefined;

  const loadPrevious = () => {
    if (!hasPrevious) return;
    setHomeLineup([...previousHomeLineup]);
    setAwayLineup([...previousAwayLineup]);
  };

  const placeAt =
    (setLineup: React.Dispatch<React.SetStateAction<(number | null)[]>>) =>
    (position: number, shirt: number) => {
      setLineup((prev) => {
        const next = prev.map((v) => (v === shirt ? null : v));
        next[position - 1] = shirt;
        return next;
      });
    };

  const clearAt =
    (setLineup: React.Dispatch<React.SetStateAction<(number | null)[]>>) => (position: number) => {
      setLineup((prev) => {
        const next = [...prev];
        next[position - 1] = null;
        return next;
      });
    };

  const isFull = (lineup: (number | null)[]) => lineup.every((v) => v !== null);
  const isValid = isFull(homeLineup) && isFull(awayLineup) && servingTeam !== null;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({
      homeLineup: homeLineup as number[],
      awayLineup: awayLineup as number[],
      servingTeam: servingTeam!,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Aufstellung"
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!isValid}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {hasPrevious && (
          <Button variant="secondary" onClick={loadPrevious} className="self-start">
            <ClipboardList size={14} />
            Vorherige Aufstellung laden
          </Button>
        )}
        <div className="grid grid-cols-2 gap-4">
          <LineupColumn
            label="Heim"
            roster={homeRoster}
            lineup={homeLineup}
            onPlace={placeAt(setHomeLineup)}
            onClear={clearAt(setHomeLineup)}
            onRotateForward={() => setHomeLineup(rotateForward(homeLineup))}
            onRotateBackward={() => setHomeLineup(rotateBackward(homeLineup))}
          />
          <LineupColumn
            label="Gast"
            roster={awayRoster}
            lineup={awayLineup}
            onPlace={placeAt(setAwayLineup)}
            onClear={clearAt(setAwayLineup)}
            onRotateForward={() => setAwayLineup(rotateForward(awayLineup))}
            onRotateBackward={() => setAwayLineup(rotateBackward(awayLineup))}
          />
        </div>
        <Field label="Aufschlag">
          <div className="flex gap-2">
            <Button variant={servingTeam === 'home' ? 'primary' : 'secondary'} onClick={() => setServingTeam('home')}>
              Aufschlag Heim
            </Button>
            <Button variant={servingTeam === 'away' ? 'primary' : 'secondary'} onClick={() => setServingTeam('away')}>
              Aufschlag Gast
            </Button>
          </div>
        </Field>
      </div>
    </Dialog>
  );
}
