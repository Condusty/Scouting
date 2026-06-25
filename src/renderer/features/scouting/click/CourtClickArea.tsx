import React from 'react';
import type { TeamSide } from '@shared/types';
import { cn } from '@renderer/lib/cn';
import { shirtAtPosition } from '@renderer/features/scouting/RotationDisplay';

export type Subzone = 'a' | 'b' | 'c' | 'd';

export interface CourtClickAreaProps {
  homeLineup: number[];
  awayLineup: number[];
  rotationHome: number;
  rotationAway: number;
  /** Whether a zone click (serve start/landing, attack start/landing, block touch/landing) is expected right now. */
  zoneClickActive: boolean;
  /** Whose on-court players are clickable right now (reception/attack/block player picks). */
  activePlayerSide: TeamSide | null;
  liberoShirt?: { home: number | null; away: number | null };
  onZoneClick: (zone: number, subzone?: Subzone) => void;
  onOutOfBounds: () => void;
  onPlayerClick: (team: TeamSide, shirtNumber: number) => void;
}

const SUBZONES: Subzone[] = ['a', 'b', 'c', 'd'];

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

const POSITION_ZONES = new Set([1, 2, 3, 4, 5, 6]);

function ZoneCell({
  zone,
  team,
  shirt,
  clickable,
  onZoneClick,
  onPlayerClick,
}: {
  zone: number;
  team: TeamSide;
  shirt: number | null;
  clickable: boolean;
  onZoneClick: (zone: number, subzone?: Subzone) => void;
  onPlayerClick: (team: TeamSide, shirtNumber: number) => void;
}) {
  const showPlayer = shirt !== null && POSITION_ZONES.has(zone);

  return (
    <div className="relative grid grid-cols-2 grid-rows-2 overflow-hidden rounded border border-zinc-700 bg-zinc-900/60">
      {SUBZONES.map((sz) => (
        <button
          key={sz}
          type="button"
          disabled={!clickable}
          onClick={() => onZoneClick(zone, sz)}
          className={cn(
            'flex items-center justify-center text-[10px] text-zinc-600 transition-colors',
            clickable && 'cursor-pointer hover:bg-sky-500/20 hover:text-sky-300 active:bg-sky-500/30',
            !clickable && 'pointer-events-none',
          )}
        >
          {zone}
          {sz}
        </button>
      ))}
      {showPlayer && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlayerClick(team, shirt as number);
          }}
          className="absolute inset-0 m-auto flex h-7 w-7 items-center justify-center self-center justify-self-center rounded-full border border-sky-400 bg-zinc-950/90 text-xs font-bold text-sky-300 shadow transition-colors hover:bg-sky-500/30 active:bg-sky-500/40"
        >
          {shirt}
        </button>
      )}
    </div>
  );
}

function TeamHalf({
  team,
  grid,
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
  lineup: number[];
  rotation: number;
  zoneClickable: boolean;
  playerClickable: boolean;
  liberoShirt?: number | null;
  onZoneClick: (zone: number, subzone?: Subzone) => void;
  onPlayerClick: (team: TeamSide, shirtNumber: number) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="grid flex-1 grid-cols-3 grid-rows-3 gap-1.5">
        {grid.flatMap((row, rowIndex) =>
          row.map((zone, colIndex) => {
            const position = POSITION_ZONES.has(zone) ? zone : null;
            const shirt = position !== null ? shirtAtPosition(lineup, rotation, position) : null;
            return (
              <ZoneCell
                key={`${rowIndex}-${colIndex}`}
                zone={zone}
                team={team}
                shirt={shirt}
                clickable={zoneClickable || (playerClickable && shirt !== null)}
                onZoneClick={onZoneClick}
                onPlayerClick={onPlayerClick}
              />
            );
          }),
        )}
      </div>
      {liberoShirt != null && playerClickable && (
        <button
          type="button"
          onClick={() => onPlayerClick(team, liberoShirt)}
          className="self-start rounded-full border border-amber-400 bg-zinc-900 px-2 py-1 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
        >
          Libero #{liberoShirt}
        </button>
      )}
    </div>
  );
}

export function CourtClickArea({
  homeLineup,
  awayLineup,
  rotationHome,
  rotationAway,
  zoneClickActive,
  activePlayerSide,
  liberoShirt,
  onZoneClick,
  onOutOfBounds,
  onPlayerClick,
}: CourtClickAreaProps) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'flex items-stretch gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3',
          zoneClickActive && 'border-dashed border-red-500/40',
        )}
      >
        <div className="flex flex-1 gap-3">
          <TeamHalf
            team="home"
            grid={HOME_GRID}
            lineup={homeLineup}
            rotation={rotationHome}
            zoneClickable={zoneClickActive}
            playerClickable={activePlayerSide === 'home'}
            liberoShirt={liberoShirt?.home}
            onZoneClick={onZoneClick}
            onPlayerClick={onPlayerClick}
          />
          <div className="w-1 shrink-0 rounded bg-sky-500" />
          <TeamHalf
            team="away"
            grid={AWAY_GRID}
            lineup={awayLineup}
            rotation={rotationAway}
            zoneClickable={zoneClickActive}
            playerClickable={activePlayerSide === 'away'}
            liberoShirt={liberoShirt?.away}
            onZoneClick={onZoneClick}
            onPlayerClick={onPlayerClick}
          />
        </div>
      </div>
      {zoneClickActive && (
        <button
          type="button"
          onClick={onOutOfBounds}
          className="self-center rounded border border-dashed border-red-500/50 bg-red-500/10 px-4 py-1 text-xs text-red-300 transition-colors hover:bg-red-500/20"
        >
          Aus / Ins Netz (=)
        </button>
      )}
    </div>
  );
}
