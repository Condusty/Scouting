import React, { useRef, useState } from 'react';
import type { TeamSide } from '@shared/types';
import { cn } from '@renderer/lib/cn';
import { shirtAtPosition } from '@renderer/features/scouting/RotationDisplay';

export type Subzone = 'a' | 'b' | 'c' | 'd';
export type ClickRole = 'start' | 'end' | null;

export interface CourtClickAreaProps {
  homeLineup: number[];
  awayLineup: number[];
  rotationHome: number;
  rotationAway: number;
  /** Whether the main court grid (serve landing, attack start/landing, block landing) is clickable right now. */
  zoneClickActive: boolean;
  /** Whether this click establishes a new start point ('start'), completes a pair ('end'), or neither. */
  clickRole: ClickRole;
  /** Set only during SERVE_START — that team's behind-the-baseline strip becomes active. */
  serveStartTeam?: TeamSide;
  /** Team whose along-the-net block area is live right now (during an attack, or the dedicated BLOCK_TOUCH step). */
  blockAreaTeam?: TeamSide;
  /** Whose on-court players are clickable right now (reception/attack/block player picks). */
  activePlayerSide: TeamSide | null;
  liberoShirt?: { home: number | null; away: number | null };
  onZoneClick: (zone: number, subzone: Subzone | undefined, team: TeamSide) => void;
  onBlockAreaClick: (zone: number, subzone?: Subzone) => void;
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
const HOME_BACK_ZONES = [5, 6, 1]; // back column, rows top-to-bottom
const AWAY_BACK_ZONES = [1, 6, 5];
const HOME_FRONT_ZONES = [4, 3, 2]; // front (net-side) column, rows top-to-bottom
const AWAY_FRONT_ZONES = [2, 3, 4];

// Court square is sized from the viewport directly (not from ancestor flex sizing) so it stays
// large and keeps a true 1:1 aspect regardless of how the surrounding chrome lays out.
const SQUARE_SIZE = 'min(66vh, 34vw)';

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

/** Reports a click's position relative to the shared row container (for the start→end arrow overlay). */
function useDualClick(rowRef: React.RefObject<HTMLDivElement | null>, onTrailPoint: (xPct: number, yPct: number) => void) {
  return (e: React.MouseEvent) => {
    const rowRect = rowRef.current?.getBoundingClientRect();
    if (rowRect) {
      onTrailPoint(((e.clientX - rowRect.left) / rowRect.width) * 100, ((e.clientY - rowRect.top) / rowRect.height) * 100);
    }
  };
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
  rowRef,
  onZoneClick,
  onPlayerClick,
  onTrailPoint,
  onClearTrail,
  blockActive,
  blockZones,
  onBlockPick,
}: {
  team: TeamSide;
  grid: number[][];
  attackLineFrac: number;
  lineup: number[];
  rotation: number;
  zoneClickable: boolean;
  playerClickable: boolean;
  liberoShirt?: number | null;
  rowRef: React.RefObject<HTMLDivElement | null>;
  onZoneClick: (zone: number, subzone: Subzone | undefined, team: TeamSide) => void;
  onPlayerClick: (team: TeamSide, shirtNumber: number) => void;
  onTrailPoint: (xPct: number, yPct: number) => void;
  onClearTrail: () => void;
  blockActive: boolean;
  blockZones: number[];
  onBlockPick: (zone: number, subzone?: Subzone) => void;
}) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [blockMarks, setBlockMarks] = useState<Mark[]>([]);
  const reportTrail = useDualClick(rowRef, onTrailPoint);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoneClickable) return;
    e.stopPropagation();
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

    reportTrail(e);
    onZoneClick(zone, subzone, team);
  };

  const handleBlockClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!blockActive) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top) / rect.height;
    const row = Math.min(2, Math.max(0, Math.floor(yFrac * 3)));
    const zone = blockZones[row];
    const subzone = quadrant(xFrac, (yFrac * 3) % 1);

    const id = ++markId;
    setBlockMarks((prev) => [...prev, { id, left: xFrac * 100, top: yFrac * 100 }]);
    window.setTimeout(() => setBlockMarks((prev) => prev.filter((m) => m.id !== id)), 600);

    reportTrail(e);
    onBlockPick(zone, subzone);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div
        onClick={handleClick}
        style={{ width: SQUARE_SIZE, height: SQUARE_SIZE }}
        className={cn(
          'relative shrink-0 rounded-md border-2 border-white/30 bg-amber-900/10 transition-colors',
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
        {/* Block area is overlaid directly on the court at the net edge (not a separate reserved
            strip) so there's no empty gap between court and net when it's inactive. */}
        <div
          onClick={handleBlockClick}
          style={{ width: '16%' }}
          className={cn(
            'absolute inset-y-0 z-10 cursor-crosshair rounded-sm border-2 border-dashed border-amber-400/60 bg-amber-500/10 transition-colors hover:bg-amber-500/20',
            team === 'home' ? 'right-0' : 'left-0',
            !blockActive && 'invisible',
          )}
          title={`Blockbarren — Berührpunkt am Netz (${team === 'home' ? 'Heim' : 'Gast'})`}
        >
          <Marks marks={blockMarks} />
        </div>
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
                onClearTrail();
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
      <div className={cn('shrink-0', (liberoShirt == null || !playerClickable) && 'invisible')}>
        <button
          type="button"
          onClick={() => {
            if (liberoShirt == null) return;
            onClearTrail();
            onPlayerClick(team, liberoShirt);
          }}
          className="self-start rounded-full border border-amber-400 bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
        >
          Libero #{liberoShirt ?? '–'}
        </button>
      </div>
    </div>
  );
}

function EdgeStrip({
  active,
  title,
  className,
  zones,
  rowRef,
  onPick,
  onTrailPoint,
}: {
  active: boolean;
  title: string;
  className: string;
  zones: number[];
  rowRef: React.RefObject<HTMLDivElement | null>;
  onPick: (zone: number, subzone?: Subzone) => void;
  onTrailPoint: (xPct: number, yPct: number) => void;
}) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const reportTrail = useDualClick(rowRef, onTrailPoint);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!active) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top) / rect.height;
    const row = Math.min(2, Math.max(0, Math.floor(yFrac * 3)));
    const zone = zones[row];
    const subzone = quadrant(xFrac, (yFrac * 3) % 1);

    const id = ++markId;
    setMarks((prev) => [...prev, { id, left: xFrac * 100, top: yFrac * 100 }]);
    window.setTimeout(() => setMarks((prev) => prev.filter((m) => m.id !== id)), 600);

    reportTrail(e);
    onPick(zone, subzone);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative h-full shrink-0 cursor-crosshair rounded-md border-2 border-dashed transition-colors',
        className,
        !active && 'invisible',
      )}
      title={title}
    >
      <Marks marks={marks} />
    </div>
  );
}

function Arrow({ start, end }: { start: { x: number; y: number } | null; end: { x: number; y: number } | null }) {
  if (start === null || end === null) return null;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <marker id="court-arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="rgb(56 189 248)" />
        </marker>
      </defs>
      <line
        x1={`${start.x}%`}
        y1={`${start.y}%`}
        x2={`${end.x}%`}
        y2={`${end.y}%`}
        stroke="rgb(56 189 248)"
        strokeWidth={2}
        strokeDasharray="6 4"
        markerEnd="url(#court-arrowhead)"
      />
      <circle cx={`${start.x}%`} cy={`${start.y}%`} r={4} fill="rgb(56 189 248)" />
    </svg>
  );
}

export function CourtClickArea({
  homeLineup,
  awayLineup,
  rotationHome,
  rotationAway,
  zoneClickActive,
  clickRole,
  serveStartTeam,
  blockAreaTeam,
  activePlayerSide,
  liberoShirt,
  onZoneClick,
  onBlockAreaClick,
  onOutOfBounds,
  onPlayerClick,
}: CourtClickAreaProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [trail, setTrail] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({
    start: null,
    end: null,
  });

  const handleTrailPoint = (x: number, y: number) => {
    if (clickRole === 'start') setTrail({ start: { x, y }, end: null });
    else if (clickRole === 'end') setTrail((prev) => ({ start: prev.start, end: { x, y } }));
  };
  const clearTrail = () => setTrail({ start: null, end: null });

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 overflow-auto">
      <div
        className="flex items-stretch justify-center gap-4 rounded-lg border border-dashed border-red-500/0 p-6 transition-colors"
        onClick={() => zoneClickActive && onOutOfBounds()}
        title={zoneClickActive ? 'Klick außerhalb des Feldes = Aus' : undefined}
      >
        <div ref={rowRef} className="relative flex items-stretch gap-2">
          <EdgeStrip
            active={serveStartTeam === 'home'}
            title="Aufschlagstartpunkt (Heim)"
            className="w-10 border-sky-500/50 bg-sky-500/5 hover:bg-sky-500/10"
            zones={HOME_BACK_ZONES}
            rowRef={rowRef}
            onPick={(zone, subzone) => onZoneClick(zone, subzone, 'home')}
            onTrailPoint={handleTrailPoint}
          />
          <TeamHalf
            team="home"
            grid={HOME_GRID}
            attackLineFrac={HOME_ATTACK_LINE_FRAC}
            lineup={homeLineup}
            rotation={rotationHome}
            zoneClickable={zoneClickActive}
            playerClickable={activePlayerSide === 'home'}
            liberoShirt={liberoShirt?.home}
            rowRef={rowRef}
            onZoneClick={onZoneClick}
            onPlayerClick={onPlayerClick}
            onTrailPoint={handleTrailPoint}
            onClearTrail={clearTrail}
            blockActive={blockAreaTeam === 'home'}
            blockZones={HOME_FRONT_ZONES}
            onBlockPick={onBlockAreaClick}
          />
          <div className="w-1.5 shrink-0 self-stretch rounded bg-sky-500" />
          <TeamHalf
            team="away"
            grid={AWAY_GRID}
            attackLineFrac={AWAY_ATTACK_LINE_FRAC}
            lineup={awayLineup}
            rotation={rotationAway}
            zoneClickable={zoneClickActive}
            playerClickable={activePlayerSide === 'away'}
            liberoShirt={liberoShirt?.away}
            rowRef={rowRef}
            onZoneClick={onZoneClick}
            onPlayerClick={onPlayerClick}
            onTrailPoint={handleTrailPoint}
            onClearTrail={clearTrail}
            blockActive={blockAreaTeam === 'away'}
            blockZones={AWAY_FRONT_ZONES}
            onBlockPick={onBlockAreaClick}
          />
          <EdgeStrip
            active={serveStartTeam === 'away'}
            title="Aufschlagstartpunkt (Gast)"
            className="w-10 border-sky-500/50 bg-sky-500/5 hover:bg-sky-500/10"
            zones={AWAY_BACK_ZONES}
            rowRef={rowRef}
            onPick={(zone, subzone) => onZoneClick(zone, subzone, 'away')}
            onTrailPoint={handleTrailPoint}
          />
          <Arrow start={trail.start} end={trail.end} />
        </div>
      </div>
      <button
        type="button"
        onClick={onOutOfBounds}
        className={cn(
          'rounded border border-dashed border-red-500/50 bg-red-500/10 px-4 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/20',
          !zoneClickActive && 'invisible',
        )}
      >
        Aus / Ins Netz (=)
      </button>
    </div>
  );
}
