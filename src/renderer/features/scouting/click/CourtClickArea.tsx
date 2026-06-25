import React, { useState } from 'react';
import type { TeamSide } from '@shared/types';
import { cn } from '@renderer/lib/cn';
import { shirtAtPosition } from '@renderer/features/scouting/RotationDisplay';

export type Subzone = 'a' | 'b' | 'c' | 'd';

export interface CourtClickAreaProps {
  homeLineup: number[];
  awayLineup: number[];
  rotationHome: number;
  rotationAway: number;
  /** Whether a zone click (serve landing, attack start/landing, block touch/landing) is expected right now. */
  zoneClickActive: boolean;
  /** Set only during SERVE_START — shows the behind-the-baseline strip for that team. */
  serveStartTeam?: TeamSide;
  /** Whose on-court players are clickable right now (reception/attack/block player picks). */
  activePlayerSide: TeamSide | null;
  liberoShirt?: { home: number | null; away: number | null };
  onZoneClick: (zone: number, subzone?: Subzone) => void;
  onOutOfBounds: () => void;
  onPlayerClick: (team: TeamSide, shirtNumber: number) => void;
}

// rows = left/center/right side of the court, columns = back/mid/front (home) or front/mid/back (away)
// — zone numbers are relative to the acting team's own grid, matching DataVolley convention.
const HOME_GRID: number[][] = [
  [5, 7, 4],
  [6, 8, 3],
  [1, 9, 2],
];
const AWAY_GRID: number[][] = [
  [2, 9, 1],
  [3, 8, 6],
  [4, 7, 5],
];
const HOME_ATTACK_LINE_FRAC = 2 / 3; // between mid (col 1) and front/net (col 2)
const AWAY_ATTACK_LINE_FRAC = 1 / 3; // between front/net (col 0) and mid (col 1)
const HOME_BACK_ZONES = [5, 6, 1]; // column 0, rows top-to-bottom
const AWAY_BACK_ZONES = [1, 6, 5]; // column 2, rows top-to-bottom

const POSITION_ZONES = new Set([1, 2, 3, 4, 5, 6]);

function quadrant(xFrac: number, yFrac: number): Subzone {
  if (xFrac < 0.5) return yFrac < 0.5 ? 'a' : 'c';
  return yFrac < 0.5 ? 'b' : 'd';
}

function positionPercent(grid: number[][], position: number): { left: number; top: number } {
  for (let row = 0; row < grid.length; row++) {
    const col = grid[row].indexOf(position);
    if (col !== -1) return { left: ((col + 0.5) / 3) * 100, top: ((row + 0.5) / 3) * 100 };
  }
  return { left: 50, top: 50 };
}

interface Mark {
  id: number;
  left: number;
  top: number;
}

let markId = 0;

function Marks({ marks }: { marks: Mark[] }) {
  return (
    <>
      {marks.map((m) => (
        <span
          key={m.id}
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-sky-400"
          style={{ left: `${m.left}%`, top: `${m.top}%` }}
        />
      ))}
    </>
  );
}

function TeamHalf({
  team,
  grid,
  attackLineFrac,
  lineup,
  rotation,
  zoneClickable,
  playerClickable,
  liberoShirt,
  onZoneClick,
  onPlayerClick,
}: {
  team: TeamSide;
  grid: number[][];
  attackLineFrac: number;
  lineup: number[];
  rotation: number;
  zoneClickable: boolean;
  playerClickable: boolean;
  liberoShirt?: number | null;
  onZoneClick: (zone: number, subzone?: Subzone) => void;
  onPlayerClick: (team: TeamSide, shirtNumber: number) => void;
}) {
  const [marks, setMarks] = useState<Mark[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoneClickable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top) / rect.height;
    const col = Math.min(2, Math.max(0, Math.floor(xFrac * 3)));
    const row = Math.min(2, Math.max(0, Math.floor(yFrac * 3)));
    const zone = grid[row][col];
    const subzone = quadrant((xFrac * 3) % 1, (yFrac * 3) % 1);

    const id = ++markId;
    setMarks((prev) => [...prev, { id, left: xFrac * 100, top: yFrac * 100 }]);
    window.setTimeout(() => setMarks((prev) => prev.filter((m) => m.id !== id)), 600);

    onZoneClick(zone, subzone);
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div
        onClick={handleClick}
        className={cn(
          'relative aspect-square w-full rounded-md border-2 border-white/30 bg-amber-900/10 transition-colors',
          zoneClickable && 'cursor-crosshair hover:bg-amber-900/20',
        )}
      >
        <div
          className="pointer-events-none absolute inset-y-0 border-dashed border-white/25"
          style={
            team === 'home'
              ? { left: `${attackLineFrac * 100}%`, borderRightWidth: 2 }
              : { left: `${attackLineFrac * 100}%`, borderLeftWidth: 2 }
          }
        />
        <Marks marks={marks} />
        {[1, 2, 3, 4, 5, 6].map((position) => {
          const shirt = shirtAtPosition(lineup, rotation, position);
          if (shirt === null) return null;
          const { left, top } = positionPercent(grid, position);
          return (
            <button
              key={position}
              type="button"
              disabled={!playerClickable}
              onClick={(e) => {
                e.stopPropagation();
                onPlayerClick(team, shirt);
              }}
              style={{ left: `${left}%`, top: `${top}%` }}
              className={cn(
                'absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-zinc-950/90 text-sm font-bold shadow-lg transition-colors',
                playerClickable
                  ? 'cursor-pointer border-sky-400 text-sky-300 hover:bg-sky-500/30 active:bg-sky-500/40'
                  : 'border-zinc-600 text-zinc-400',
              )}
            >
              {shirt}
            </button>
          );
        })}
      </div>
      {liberoShirt != null && playerClickable && (
        <button
          type="button"
          onClick={() => onPlayerClick(team, liberoShirt)}
          className="self-start rounded-full border border-amber-400 bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
        >
          Libero #{liberoShirt}
        </button>
      )}
    </div>
  );
}

function ServeStartStrip({
  team,
  onZoneClick,
}: {
  team: TeamSide;
  onZoneClick: (zone: number, subzone?: Subzone) => void;
}) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const zones = team === 'home' ? HOME_BACK_ZONES : AWAY_BACK_ZONES;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top) / rect.height;
    const row = Math.min(2, Math.max(0, Math.floor(yFrac * 3)));
    const zone = zones[row];
    const subzone = quadrant(xFrac, (yFrac * 3) % 1);

    const id = ++markId;
    setMarks((prev) => [...prev, { id, left: xFrac * 100, top: yFrac * 100 }]);
    window.setTimeout(() => setMarks((prev) => prev.filter((m) => m.id !== id)), 600);

    onZoneClick(zone, subzone);
  };

  return (
    <div
      onClick={handleClick}
      className="relative aspect-[1/3] w-12 shrink-0 cursor-crosshair rounded-md border-2 border-dashed border-sky-500/50 bg-sky-500/5 transition-colors hover:bg-sky-500/10"
      title={`Aufschlagstartpunkt (${team === 'home' ? 'Heim' : 'Gast'})`}
    >
      <Marks marks={marks} />
    </div>
  );
}

export function CourtClickArea({
  homeLineup,
  awayLineup,
  rotationHome,
  rotationAway,
  zoneClickActive,
  serveStartTeam,
  activePlayerSide,
  liberoShirt,
  onZoneClick,
  onOutOfBounds,
  onPlayerClick,
}: CourtClickAreaProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <div className="flex w-full max-w-3xl items-stretch gap-2">
        {serveStartTeam === 'home' && <ServeStartStrip team="home" onZoneClick={onZoneClick} />}
        <TeamHalf
          team="home"
          grid={HOME_GRID}
          attackLineFrac={HOME_ATTACK_LINE_FRAC}
          lineup={homeLineup}
          rotation={rotationHome}
          zoneClickable={zoneClickActive}
          playerClickable={activePlayerSide === 'home'}
          liberoShirt={liberoShirt?.home}
          onZoneClick={onZoneClick}
          onPlayerClick={onPlayerClick}
        />
        <div className="w-1.5 shrink-0 rounded bg-sky-500" />
        <TeamHalf
          team="away"
          grid={AWAY_GRID}
          attackLineFrac={AWAY_ATTACK_LINE_FRAC}
          lineup={awayLineup}
          rotation={rotationAway}
          zoneClickable={zoneClickActive}
          playerClickable={activePlayerSide === 'away'}
          liberoShirt={liberoShirt?.away}
          onZoneClick={onZoneClick}
          onPlayerClick={onPlayerClick}
        />
        {serveStartTeam === 'away' && <ServeStartStrip team="away" onZoneClick={onZoneClick} />}
      </div>
      {zoneClickActive && (
        <button
          type="button"
          onClick={onOutOfBounds}
          className="rounded border border-dashed border-red-500/50 bg-red-500/10 px-4 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/20"
        >
          Aus / Ins Netz (=)
        </button>
      )}
    </div>
  );
}
