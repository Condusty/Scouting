import React from 'react';
import type { RxAttackPair, SkillReport } from '@renderer/lib/stats-engine';
import type { Effect } from '@shared/types';
import { cn } from '@renderer/lib/cn';

const RX_EFFECTS: (Effect | null)[] = ['#', '+', '!', '-', '/', '=', null];
const ATK_EFFECTS: (Effect | null)[] = ['#', '+', '!', '-', '=', '/'];

type RxFilterVal = Effect | null | 'all';

const EFFECT_LABEL: Record<string, string> = {
  '#': 'Exzellent', '+': 'Gut', '!': 'OK', '-': 'Schlecht', '/': 'Freeball', '=': 'Fehler',
};
const EFFECT_COLOR: Record<string, string> = {
  '#': '#22c55e', '+': '#86efac', '!': '#71717a', '-': '#f97316', '/': '#eab308', '=': '#ef4444',
};
function ec(e: string | null) { return e ? (EFFECT_COLOR[e] ?? '#71717a') : '#52525b'; }
function el(e: string | null) { return e ? (EFFECT_LABEL[e] ?? e) : '?'; }

// ── Attack half-court zone positions ─────────────────────────────────────────
// viewBox "0 0 280 200"
// Shows opponent's half (where attacks land) — zone layout mirrored (receiving team faces up)

const ATK_ZONES: Record<number, [number, number]> = {
  2: [53, 65],  3: [140, 65],  4: [227, 65],   // front row (near net, top of half)
  9: [53, 110], 8: [140, 110], 7: [227, 110],  // mid (optional)
  1: [53, 155], 6: [140, 155], 5: [227, 155],  // back row
};

function deterministicJitter(i: number, z: number): [number, number] {
  return [Math.sin(i * 6.7 + z * 4.3) * 16, Math.cos(i * 4.9 + z * 5.1) * 10];
}

// ── Quality Transition Matrix ─────────────────────────────────────────────────

function QualityMatrix({ pairs }: { pairs: RxAttackPair[] }) {
  const cell = (rx: Effect | null, atk: Effect | null) =>
    pairs.filter((p) => p.rxEffect === rx && p.atkEffect === atk).length;

  const rowTotal = (rx: Effect | null) => pairs.filter((p) => p.rxEffect === rx).length;

  const rxUsed = RX_EFFECTS.filter((e) => pairs.some((p) => p.rxEffect === e));
  if (!rxUsed.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="pb-2 pr-3 text-left text-[10px] uppercase tracking-wide text-zinc-500">
              Annahme ↓ / Angriff →
            </th>
            {ATK_EFFECTS.map((e) => (
              <th key={String(e)} className="px-3 pb-2 text-center text-[10px] font-semibold"
                style={{ color: ec(e) }}>
                {e ?? '?'}
              </th>
            ))}
            <th className="px-3 pb-2 text-center text-[10px] uppercase tracking-wide text-zinc-500">Ges.</th>
          </tr>
        </thead>
        <tbody>
          {rxUsed.map((rx) => {
            const total = rowTotal(rx);
            if (!total) return null;
            return (
              <tr key={String(rx)} className="border-t border-zinc-800">
                <td className="py-1.5 pr-3">
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold" style={{ color: ec(rx) }}>{rx ?? '?'}</span>
                    <span className="text-xs text-zinc-500">{el(rx)}</span>
                  </span>
                </td>
                {ATK_EFFECTS.map((atk) => {
                  const cnt = cell(rx, atk);
                  return (
                    <td key={String(atk)} className="px-3 py-1.5 text-center font-mono text-xs">
                      <span style={{ color: cnt > 0 ? ec(atk) : '#3f3f46' }}>
                        {cnt > 0 ? cnt : '—'}
                      </span>
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-center font-mono text-xs font-semibold text-zinc-300">
                  {total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Attack landing court (half-court heatmap) ─────────────────────────────────

const ZONE_CELLS = [
  { id: 4, x: 184, y: 10, w: 86, h: 90 },
  { id: 3, x: 96,  y: 10, w: 88, h: 90 },
  { id: 2, x: 10,  y: 10, w: 86, h: 90 },
  { id: 7, x: 184, y: 100, w: 86, h: 70 },
  { id: 8, x: 96,  y: 100, w: 88, h: 70 },
  { id: 9, x: 10,  y: 100, w: 86, h: 70 },
  { id: 5, x: 184, y: 170, w: 86, h: 80 },
  { id: 6, x: 96,  y: 170, w: 88, h: 80 },
  { id: 1, x: 10,  y: 170, w: 86, h: 80 },
];

function AttackZoneChart({ pairs, rxFilter }: { pairs: RxAttackPair[]; rxFilter: RxFilterVal }) {
  const filtered = rxFilter === 'all' ? pairs : pairs.filter((p) => p.rxEffect === (rxFilter as Effect | null));

  const byZone = new Map<number, { total: number; kills: number; errors: number }>();
  for (const p of filtered) {
    const z = p.atkEndZone;
    if (!z) continue;
    if (!byZone.has(z)) byZone.set(z, { total: 0, kills: 0, errors: 0 });
    const s = byZone.get(z)!;
    s.total++;
    if (p.atkEffect === '#') s.kills++;
    if (p.atkEffect === '=') s.errors++;
  }

  const maxCount = Math.max(0, ...[...byZone.values()].map((v) => v.total));

  return (
    <svg viewBox="0 0 280 260" className="w-full max-w-xs">
      {/* net indicator */}
      <text x="140" y="8" textAnchor="middle" fontSize="7" fill="#3b82f6" letterSpacing="2">NETZ</text>
      <line x1="10" y1="11" x2="270" y2="11" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4 3" />

      {ZONE_CELLS.map(({ id, x, y, w, h }) => {
        const stats = byZone.get(id);
        const intensity = stats && maxCount > 0 ? stats.total / maxCount : 0;
        const bg = intensity > 0
          ? `rgba(56,189,248,${0.08 + intensity * 0.42})`
          : 'transparent';
        const killPct = stats ? Math.round((stats.kills / stats.total) * 100) : 0;
        return (
          <g key={id}>
            <rect x={x} y={y + 14} width={w} height={h} fill={bg} stroke="#3f3f46" strokeWidth="1" rx="1" />
            <text x={x + w / 2} y={y + 14 + h / 2 - 6} textAnchor="middle"
              fontSize="18" fill="#27272a" fontWeight="bold">{id}</text>
            {stats && (
              <>
                <text x={x + w / 2} y={y + 14 + h / 2 + 9}
                  textAnchor="middle" fontSize="11" fill="#e4e4e7" fontWeight="bold">
                  {stats.total}
                </text>
                <text x={x + w / 2} y={y + 14 + h / 2 + 21}
                  textAnchor="middle" fontSize="8" fill="#22c55e">
                  #{killPct}%
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface ReceptionAttackSectionProps {
  pairs: RxAttackPair[];
  rxReport: SkillReport | undefined;
  atkReport: SkillReport | undefined;
}

export function ReceptionAttackSection({ pairs, rxReport, atkReport }: ReceptionAttackSectionProps) {
  const [rxFilter, setRxFilter] = React.useState<RxFilterVal>('all');

  if (!pairs.length && !rxReport && !atkReport) {
    return <p className="py-4 text-sm text-zinc-500">Keine Annahme-/Angriff-Daten.</p>;
  }

  const usedRx: RxFilterVal[] = ['all', ...RX_EFFECTS.filter((e) => pairs.some((p) => p.rxEffect === e))];

  return (
    <div className="space-y-5">
      {/* Reception stats */}
      {rxReport && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Annahme-Statistik</h3>
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
                {[
                  { label: 'Gesamt', s: rxReport.team },
                  ...[...rxReport.byPlayer].sort((a, b) => a.playerNumber - b.playerNumber).map((p) => ({
                    label: `#${p.playerNumber}`, s: p,
                  })),
                ].map(({ label, s }) => (
                  <tr key={label} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                    <td className="py-1 pr-3 font-mono text-xs text-zinc-300">{label}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-zinc-200">{s.total}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-green-400">{s.excellent}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-emerald-300">{s.positive}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-zinc-400">{s.neutral}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-orange-400">{s.negative}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-yellow-400">{s.freeball}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-red-400">{s.error}</td>
                    <td className={cn('px-2 py-1 text-center font-mono text-xs font-semibold',
                      s.efficiency >= 0.3 ? 'text-green-400' : s.efficiency >= 0.1 ? 'text-yellow-400' : 'text-red-400')}>
                      {Math.round(s.efficiency * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quality matrix */}
      {pairs.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Annahme-Qualität → Angriff-Qualität
          </h3>
          <QualityMatrix pairs={pairs} />
        </div>
      )}

      {/* Attack zone chart */}
      {pairs.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Angriff-Landezonen (nach Annahmequali. filtern)
          </h3>
          <div className="flex flex-wrap gap-1 mb-3">
            {usedRx.map((e) => (
              <button
                key={String(e)}
                onClick={() => setRxFilter(e as any)}
                className={cn(
                  'no-drag rounded px-2.5 py-0.5 text-xs font-medium transition-colors',
                  rxFilter === e
                    ? 'bg-sky-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200',
                )}
                style={rxFilter !== e && e !== 'all' ? { borderLeft: `2px solid ${ec(e as Effect | null)}` } : {}}
              >
                {e === 'all' ? 'Alle' : `R${e}`} — {e === 'all' ? pairs.length : pairs.filter(p => p.rxEffect === (e as Effect | null)).length}
              </button>
            ))}
          </div>
          <AttackZoneChart pairs={pairs} rxFilter={rxFilter} />
          <p className="mt-1 text-[10px] text-zinc-600">
            Helligkeit = Trefferhäufigkeit · #% = Kill-Quote · Zahlenwert = Gesamttreffer
          </p>
        </div>
      )}

      {/* Attack stats */}
      {atkReport && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Angriff-Statistik</h3>
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
                {[
                  { label: 'Gesamt', s: atkReport.team },
                  ...[...atkReport.byPlayer].sort((a, b) => a.playerNumber - b.playerNumber).map((p) => ({
                    label: `#${p.playerNumber}`, s: p,
                  })),
                ].map(({ label, s }) => (
                  <tr key={label} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                    <td className="py-1 pr-3 font-mono text-xs text-zinc-300">{label}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-zinc-200">{s.total}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-green-400">{s.excellent}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-emerald-300">{s.positive}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-zinc-400">{s.neutral}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-orange-400">{s.negative}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-yellow-400">{s.freeball}</td>
                    <td className="px-2 py-1 text-center font-mono text-xs text-red-400">{s.error}</td>
                    <td className={cn('px-2 py-1 text-center font-mono text-xs font-semibold',
                      s.efficiency >= 0.3 ? 'text-green-400' : s.efficiency >= 0.1 ? 'text-yellow-400' : 'text-red-400')}>
                      {Math.round(s.efficiency * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
