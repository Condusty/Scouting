import React from 'react';
import type { Skill } from '@shared/types';
import type { SkillReport, SkillStats } from '@renderer/lib/stats-engine';
import { cn } from '@renderer/lib/cn';

const SKILL_LABELS: Record<Skill, string> = {
  S: 'Aufschlag', R: 'Annahme', A: 'Angriff',
  B: 'Block', D: 'Abwehr', E: 'Zuspiel', F: 'Freeball',
};

const SKILL_ORDER: Skill[] = ['S', 'R', 'A', 'B', 'D', 'E'];

function effColor(eff: number) {
  if (eff >= 0.5) return 'text-green-400';
  if (eff >= 0.2) return 'text-yellow-400';
  return 'text-red-400';
}

function fmt(n: number) {
  return n === 0 ? '—' : String(n);
}

function StatsCells({ s }: { s: SkillStats }) {
  return (
    <>
      <td className="px-2 py-1.5 text-center text-sm text-zinc-300">{s.total}</td>
      <td className="px-2 py-1.5 text-center text-sm text-green-400">{fmt(s.excellent)}</td>
      <td className="px-2 py-1.5 text-center text-sm text-zinc-300">{fmt(s.positive)}</td>
      <td className="px-2 py-1.5 text-center text-sm text-zinc-300">{fmt(s.neutral)}</td>
      <td className="px-2 py-1.5 text-center text-sm text-zinc-300">{fmt(s.negative)}</td>
      <td className="px-2 py-1.5 text-center text-sm text-zinc-300">{fmt(s.freeball)}</td>
      <td className="px-2 py-1.5 text-center text-sm text-red-400">{fmt(s.error)}</td>
      <td className={cn('px-2 py-1.5 text-center text-sm font-semibold', s.total > 0 ? effColor(s.efficiency) : 'text-zinc-600')}>
        {s.total > 0 ? `${(s.efficiency * 100).toFixed(0)}%` : '—'}
      </td>
    </>
  );
}

export function SkillStatsTable({ report }: { report: Partial<Record<Skill, SkillReport>> }) {
  const [expanded, setExpanded] = React.useState<Set<Skill>>(new Set());

  const toggle = (skill: Skill) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(skill) ? next.delete(skill) : next.add(skill);
      return next;
    });

  const rows = SKILL_ORDER.filter((s) => report[s]);

  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-zinc-500">Keine Daten erfasst.</p>;

  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-zinc-700">
          {['Skill', 'Ges.', '#', '+', '!', '-', '/', '=', 'Eff%'].map((h) => (
            <th key={h} className="px-2 pb-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500 first:pl-3 first:text-left">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((skill) => {
          const sr = report[skill]!;
          const isExp = expanded.has(skill);
          return (
            <React.Fragment key={skill}>
              <tr
                className={cn('border-b border-zinc-800 hover:bg-zinc-800/40', sr.byPlayer.length > 0 && 'cursor-pointer')}
                onClick={() => sr.byPlayer.length > 0 && toggle(skill)}
              >
                <td className="py-1.5 pl-3 pr-2 text-sm font-medium text-zinc-200">
                  {SKILL_LABELS[skill]}
                  {sr.byPlayer.length > 0 && (
                    <span className="ml-1.5 text-zinc-500">{isExp ? '▾' : '▸'}</span>
                  )}
                </td>
                <StatsCells s={sr.team} />
              </tr>
              {isExp &&
                sr.byPlayer
                  .sort((a, b) => a.playerNumber - b.playerNumber)
                  .map((p) => (
                    <tr key={p.playerNumber} className="border-b border-zinc-800/60 bg-zinc-900/60">
                      <td className="py-1 pl-6 pr-2 text-xs text-zinc-400">#{p.playerNumber}</td>
                      <StatsCells s={p} />
                    </tr>
                  ))}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
