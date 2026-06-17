import React from 'react';
import type { TeamSide } from '@shared/types';
import { useReportStore } from '@renderer/store/report.store';
import {
  buildMatchReport, buildRallySetMap, buildServeArrows,
  buildReceptionAttackPairs, buildSetScores, getSetNumbers,
} from '@renderer/lib/stats-engine';
import { SkillStatsTable } from './SkillStatsTable';
import { ServeSection } from './ServeSection';
import { ReceptionAttackSection } from './ReceptionAttackSection';
import { SetFilter } from './SetFilter';
import { cn } from '@renderer/lib/cn';

const TABS = [
  { id: 'overview',  label: 'Übersicht' },
  { id: 'serve',     label: 'Aufschlag' },
  { id: 'rxatk',    label: 'Annahme & Angriff' },
  { id: 'block',    label: 'Block & Abwehr' },
] as const;

type TabId = typeof TABS[number]['id'];

export function MatchReportView({ matchId }: { matchId: number }) {
  const { allActions, allRallies, activeSet, loading, error, load, setActiveSet } = useReportStore();
  const [team, setTeam] = React.useState<TeamSide>('home');
  const [tab, setTab] = React.useState<TabId>('overview');

  React.useEffect(() => { void load(matchId); }, [matchId, load]);

  const setNumbers = React.useMemo(() => getSetNumbers(allRallies), [allRallies]);
  const allSetScores = React.useMemo(() => buildSetScores(allRallies), [allRallies]);

  const { reportData, serveArrows, rxPairs } = React.useMemo(() => {
    if (!allRallies.length) return { reportData: null, serveArrows: [], rxPairs: [] };
    const rallySetMap = buildRallySetMap(allRallies);
    const fActions = activeSet === null ? allActions
      : allActions.filter((a) => rallySetMap.get(a.rally_id) === activeSet);
    const fRallies = activeSet === null ? allRallies
      : allRallies.filter((r) => r.set_number === activeSet);
    return {
      reportData: buildMatchReport(fActions, fRallies),
      serveArrows: buildServeArrows(fActions, rallySetMap),
      rxPairs: buildReceptionAttackPairs(fActions, fRallies),
    };
  }, [allActions, allRallies, activeSet]);

  if (loading)
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Lade …</div>;
  if (error)
    return <div className="flex flex-1 items-center justify-center text-red-400">{error}</div>;
  if (!allRallies.length)
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Keine Daten.</div>;

  const teamReport = team === 'home' ? (reportData?.home ?? {}) : (reportData?.away ?? {});
  const teamServeArrows = serveArrows.filter((a) => a.team === team);
  const teamRxPairs = rxPairs.filter((p) => p.team === team);

  return (
    // flex-1 min-w-0 → fills the flex parent (main) fully
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

      {/* ── header bar: scores, team toggle, set filter ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-700 bg-zinc-800/60 px-4 py-2">
        {/* set scores */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sätze:</span>
          {allSetScores.map((s) => (
            <span key={s.setNumber}
              className="rounded bg-zinc-700 px-2 py-0.5 font-mono text-xs text-zinc-200">
              {s.setNumber}. {s.homeScore}:{s.awayScore}
            </span>
          ))}
        </div>

        {/* team toggle */}
        <div className="flex gap-1">
          {(['home', 'away'] as TeamSide[]).map((t) => (
            <button key={t} onClick={() => setTeam(t)}
              className={cn(
                'no-drag rounded px-3 py-0.5 text-sm font-medium transition-colors',
                team === t ? 'bg-sky-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200',
              )}>
              {t === 'home' ? 'Heim' : 'Gast'}
            </button>
          ))}
        </div>

        {/* set filter */}
        <div className="ml-auto">
          <SetFilter sets={setNumbers} active={activeSet} onChange={setActiveSet} />
        </div>
      </div>

      {/* ── tab strip ── */}
      <div className="flex shrink-0 border-b border-zinc-700 bg-zinc-900/40 px-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'no-drag -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300',
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── tab content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ÜBERSICHT */}
        {tab === 'overview' && (
          <div className="p-6">
            <SkillStatsTable report={teamReport} />
          </div>
        )}

        {/* AUFSCHLAG */}
        {tab === 'serve' && (
          <div className="p-6">
            <ServeSection arrows={teamServeArrows} report={teamReport.S} />
          </div>
        )}

        {/* ANNAHME & ANGRIFF */}
        {tab === 'rxatk' && (
          <div className="p-6">
            <ReceptionAttackSection
              pairs={teamRxPairs}
              rxReport={teamReport.R}
              atkReport={teamReport.A}
            />
          </div>
        )}

        {/* BLOCK & ABWEHR */}
        {tab === 'block' && (
          <div className="grid gap-8 p-6 lg:grid-cols-2">
            {(['B', 'D'] as const).map((skill) => {
              const rep = teamReport[skill];
              const label = skill === 'B' ? 'Block' : 'Abwehr (Dig)';
              if (!rep) return (
                <div key={skill} className="rounded-lg border border-zinc-800 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-zinc-400">{label}</h3>
                  <p className="text-sm text-zinc-600">Keine Daten.</p>
                </div>
              );
              return (
                <div key={skill} className="rounded-lg border border-zinc-800 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-zinc-300">{label}</h3>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                        <th className="pb-2 pr-3 text-left">Spieler</th>
                        <th className="px-2 pb-2 text-center">Ges.</th>
                        <th className="px-2 pb-2 text-center text-green-400">#</th>
                        <th className="px-2 pb-2 text-center text-emerald-300">+</th>
                        <th className="px-2 pb-2 text-center text-zinc-400">!</th>
                        <th className="px-2 pb-2 text-center text-orange-400">-</th>
                        <th className="px-2 pb-2 text-center text-red-400">=</th>
                        <th className="px-2 pb-2 text-center">Eff%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Gesamt', s: rep.team },
                        ...[...rep.byPlayer]
                          .sort((a, b) => a.playerNumber - b.playerNumber)
                          .map((p) => ({ label: `#${p.playerNumber}`, s: p })),
                      ].map(({ label: l, s }) => (
                        <tr key={l} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                          <td className="py-1.5 pr-3 font-mono text-xs text-zinc-300">{l}</td>
                          <td className="px-2 py-1.5 text-center font-mono text-xs text-zinc-200">{s.total}</td>
                          <td className="px-2 py-1.5 text-center font-mono text-xs text-green-400">{s.excellent}</td>
                          <td className="px-2 py-1.5 text-center font-mono text-xs text-emerald-300">{s.positive}</td>
                          <td className="px-2 py-1.5 text-center font-mono text-xs text-zinc-400">{s.neutral}</td>
                          <td className="px-2 py-1.5 text-center font-mono text-xs text-orange-400">{s.negative}</td>
                          <td className="px-2 py-1.5 text-center font-mono text-xs text-red-400">{s.error}</td>
                          <td className={cn(
                            'px-2 py-1.5 text-center font-mono text-xs font-semibold',
                            s.efficiency >= 0.3 ? 'text-green-400' : s.efficiency >= 0 ? 'text-yellow-400' : 'text-red-400',
                          )}>
                            {Math.round(s.efficiency * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
