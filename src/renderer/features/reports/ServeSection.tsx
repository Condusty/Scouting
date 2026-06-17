import React from 'react';
import type { ServeArrow, SkillReport } from '@renderer/lib/stats-engine';
import type { Effect } from '@shared/types';

// ── Full-court SVG constants ─────────────────────────────────────────────────
// viewBox "0 0 280 380"  –  Top half = serving team, Bottom half = receiving team (L-R mirrored)

const TOP: Record<number, [number, number]> = {
  5: [53, 55],  6: [140, 55],  1: [227, 55],  // back row
  4: [53, 140], 3: [140, 140], 2: [227, 140], // front row
};

const BOT: Record<number, [number, number]> = {
  2: [53, 242],  3: [140, 242], 4: [227, 242], // front row (mirrored L-R)
  1: [53, 328],  6: [140, 328], 5: [227, 328], // back row
};

const SUBZONE_OFF: Record<string, [number, number]> = {
  a: [-20, -14], b: [20, -14], c: [-20, 14], d: [20, 14],
};

const EFFECT_COLOR: Record<string, string> = {
  '#': '#22c55e', '+': '#86efac', '!': '#71717a',
  '-': '#f97316', '/': '#eab308', '=': '#ef4444',
};
function ec(e: Effect | null): string { return e ? (EFFECT_COLOR[e] ?? '#71717a') : '#71717a'; }

function zoneCenter(zones: Record<number, [number, number]>, z: number | null, sub: string | null): [number, number] | null {
  if (!z || !zones[z]) return null;
  const [cx, cy] = zones[z];
  if (sub && SUBZONE_OFF[sub]) {
    const [dx, dy] = SUBZONE_OFF[sub];
    return [cx + dx, cy + dy];
  }
  return [cx, cy];
}

function deterministicJitter(i: number, zone: number): [number, number] {
  return [Math.sin(i * 7.3 + zone * 5.1) * 18, Math.cos(i * 5.7 + zone * 3.9) * 11];
}

// ── Court background SVG ─────────────────────────────────────────────────────

function CourtBg() {
  const COL = [
    { x: 10, w: 86 },
    { x: 96, w: 88 },
    { x: 184, w: 86 },
  ];
  const TOP_ROWS = [
    { y: 10, h: 90, zones: [5, 6, 1] },
    { y: 100, h: 90, zones: [4, 3, 2] },
  ];
  const BOT_ROWS = [
    { y: 200, h: 90, zones: [2, 3, 4] },
    { y: 290, h: 90, zones: [1, 6, 5] },
  ];
  return (
    <>
      {/* top court */}
      {TOP_ROWS.map((row) =>
        COL.map((col, ci) => (
          <g key={`t${row.y}-${ci}`}>
            <rect x={col.x} y={row.y} width={col.w} height={row.h}
              fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
            <text x={col.x + col.w / 2} y={row.y + row.h / 2 + 5}
              textAnchor="middle" fontSize="18" fill="#3f3f46" fontWeight="bold">
              {row.zones[ci]}
            </text>
          </g>
        ))
      )}
      {/* top court outline */}
      <rect x={10} y={10} width={260} height={180} fill="none" stroke="#52525b" strokeWidth="1.5" />

      {/* net */}
      <line x1="10" y1="192" x2="270" y2="192" stroke="#60a5fa" strokeWidth="2" strokeDasharray="5 3" />
      <text x="140" y="197" textAnchor="middle" fontSize="7" fill="#3b82f6" letterSpacing="2">NETZ</text>

      {/* bottom court */}
      {BOT_ROWS.map((row) =>
        COL.map((col, ci) => (
          <g key={`b${row.y}-${ci}`}>
            <rect x={col.x} y={row.y} width={col.w} height={row.h}
              fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
            <text x={col.x + col.w / 2} y={row.y + row.h / 2 + 5}
              textAnchor="middle" fontSize="18" fill="#27272a" fontWeight="bold">
              {row.zones[ci]}
            </text>
          </g>
        ))
      )}
      <rect x={10} y={200} width={260} height={180} fill="none" stroke="#52525b" strokeWidth="1.5" />
    </>
  );
}

// ── Per-player full-court chart ───────────────────────────────────────────────

function PlayerServeChart({ playerNum, arrows }: { playerNum: number; arrows: ServeArrow[] }) {
  const total = arrows.length;
  const aces = arrows.filter((a) => a.effect === '#').length;
  const errors = arrows.filter((a) => a.effect === '=').length;

  const MARKERS = ['#', '+', '!', '-', '/', '=', 'null'] as const;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      {/* header */}
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-zinc-700 px-2 py-0.5 font-mono text-xs font-bold text-zinc-200">
          #{playerNum}
        </span>
        <span className="text-xs text-zinc-400">{total} Aufschläge</span>
        <span className="ml-auto font-mono text-xs text-green-400"># {aces}</span>
        <span className="font-mono text-xs text-red-400">= {errors}</span>
      </div>

      <svg viewBox="0 0 280 385" className="w-full">
        <defs>
          {MARKERS.map((e) => {
            const fill = e === 'null' ? '#71717a' : (EFFECT_COLOR[e] ?? '#71717a');
            return (
              <marker key={e} id={`srv-${e}-${playerNum}`} markerWidth="7" markerHeight="7"
                refX="5" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill={fill} />
              </marker>
            );
          })}
        </defs>

        <CourtBg />

        {arrows.map((arr, i) => {
          const ezone = arr.endZone;
          if (!ezone) return null;
          const endBase = zoneCenter(BOT, ezone, arr.endSubzone);
          if (!endBase) return null;
          const [jx, jy] = deterministicJitter(i, ezone);
          const [ex, ey] = [endBase[0] + jx, endBase[1] + jy];

          const startBase = arr.startZone ? zoneCenter(TOP, arr.startZone, arr.startSubzone) : null;
          const [sx, sy] = startBase ?? [140, 2];

          const color = ec(arr.effect);
          const markId = `srv-${arr.effect ?? 'null'}-${playerNum}`;
          return (
            <line
              key={i}
              x1={sx} y1={sy} x2={ex} y2={ey - 9}
              stroke={color} strokeWidth="1.8" opacity="0.8"
              markerEnd={`url(#${markId})`}
            />
          );
        })}

        {/* server position dot */}
        <circle cx={140} cy={3} r={4} fill="#60a5fa" />
        <text x={140} y={-3} textAnchor="middle" fontSize="7" fill="#60a5fa">Server</text>
      </svg>

      {/* mini legend */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {([['#', 'Ass'], ['+', 'Gut'], ['!', 'OK'], ['-', 'Schlecht'], ['/', 'Freeball'], ['=', 'Fehler']] as [string, string][])
          .map(([e, label]) => {
            const cnt = arrows.filter((a) => a.effect === e).length;
            if (!cnt) return null;
            return (
              <span key={e} className="flex items-center gap-1 text-[10px] text-zinc-400">
                <span style={{ color: EFFECT_COLOR[e] }} className="font-bold">{e}</span>
                {label} {cnt}
              </span>
            );
          })}
      </div>
    </div>
  );
}

// ── Serve stats summary table ─────────────────────────────────────────────────

function ServeStatsRow({ label, stats }: { label: string; stats: Record<string, number> & { total: number; efficiency: number } }) {
  const effPct = Math.round(stats.efficiency * 100);
  const effColor = effPct >= 30 ? 'text-green-400' : effPct >= 10 ? 'text-yellow-400' : 'text-red-400';
  return (
    <tr className="border-t border-zinc-800 hover:bg-zinc-800/40">
      <td className="py-1 pr-3 font-mono text-xs text-zinc-300">{label}</td>
      <td className="px-2 py-1 text-center font-mono text-xs text-zinc-200">{stats.total}</td>
      <td className="px-2 py-1 text-center font-mono text-xs text-green-400">{stats.excellent}</td>
      <td className="px-2 py-1 text-center font-mono text-xs text-emerald-300">{stats.positive}</td>
      <td className="px-2 py-1 text-center font-mono text-xs text-zinc-400">{stats.neutral}</td>
      <td className="px-2 py-1 text-center font-mono text-xs text-orange-400">{stats.negative}</td>
      <td className="px-2 py-1 text-center font-mono text-xs text-yellow-400">{stats.freeball}</td>
      <td className="px-2 py-1 text-center font-mono text-xs text-red-400">{stats.error}</td>
      <td className={`px-2 py-1 text-center font-mono text-xs font-semibold ${effColor}`}>
        {effPct}%
      </td>
    </tr>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface ServeSectionProps {
  arrows: ServeArrow[];
  report: SkillReport | undefined;
}

export function ServeSection({ arrows, report }: ServeSectionProps) {
  if (!arrows.length && !report) {
    return <p className="py-4 text-sm text-zinc-500">Keine Aufschlag-Daten.</p>;
  }

  // Group arrows by player
  const byPlayer = new Map<number, ServeArrow[]>();
  for (const a of arrows) {
    const n = a.playerNumber ?? 0;
    if (!byPlayer.has(n)) byPlayer.set(n, []);
    byPlayer.get(n)!.push(a);
  }
  const players = [...byPlayer.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      {/* stats table */}
      {report && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                <th className="pb-1 pr-3 text-left">Spieler</th>
                <th className="px-2 pb-1 text-center">Ges.</th>
                <th className="px-2 pb-1 text-center text-green-400">#</th>
                <th className="px-2 pb-1 text-center text-emerald-300">+</th>
                <th className="px-2 pb-1 text-center text-zinc-400">!</th>
                <th className="px-2 pb-1 text-center text-orange-400">-</th>
                <th className="px-2 pb-1 text-center text-yellow-400">/</th>
                <th className="px-2 pb-1 text-center text-red-400">=</th>
                <th className="px-2 pb-1 text-center">Eff%</th>
              </tr>
            </thead>
            <tbody>
              <ServeStatsRow label="Gesamt" stats={report.team as any} />
              {[...report.byPlayer]
                .sort((a, b) => a.playerNumber - b.playerNumber)
                .map((p) => (
                  <ServeStatsRow key={p.playerNumber} label={`#${p.playerNumber}`} stats={p as any} />
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* per-player charts */}
      {players.length > 0 && (
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {players.map((num) => (
            <PlayerServeChart key={num} playerNum={num} arrows={byPlayer.get(num)!} />
          ))}
        </div>
      )}
    </div>
  );
}
