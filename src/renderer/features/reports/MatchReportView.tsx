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

export function MatchReportView({ matchId }: { matchId: number }) {
  const { allActions, allRallies, activeSet, loading, error, load, setActiveSet } = useReportStore();
  const [team, setTeam] = React.useState<TeamSide>('home');

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
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── top bar: scores + set filter ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-zinc-700 bg-zinc-800/60 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sätze:</span>
          {allSetScores.map((s) => (
            <span key={s.setNumber}
              className="rounded bg-zinc-700 px-2 py-0.5 font-mono text-xs text-zinc-200">
              {s.setNumber}. {s.homeScore}:{s.awayScore}
            </span>
          ))}
        </div>
        <div className="ml-auto">
          <SetFilter sets={setNumbers} active={activeSet} onChange={setActiveSet} />
        </div>
      </div>

      {/* ── team toggle ── */}
      <div className="flex shrink-0 gap-2 border-b border-zinc-700 px-4 py-2">
        {(['home', 'away'] as TeamSide[]).map((t) => (
          <button key={t} onClick={() => setTeam(t)}
            className={cn(
              'no-drag rounded-md px-3 py-1 text-sm font-medium transition-colors',
              team === t ? 'bg-sky-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200',
            )}>
            {t === 'home' ? 'Heim' : 'Gast'}
          </button>
        ))}
      </div>

      {/* ── scrollable sections ── */}
      <div className="flex-1 space-y-8 overflow-y-auto p-5">

        {/* ── 1. Statistik-Übersicht ── */}
        <section>
          <h2 className="mb-3 border-b border-zinc-800 pb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Statistik-Übersicht
          </h2>
          <SkillStatsTable report={teamReport} />
        </section>

        {/* ── 2. Aufschlag ── */}
        <section>
          <h2 className="mb-3 border-b border-zinc-800 pb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Aufschlag
          </h2>
          <ServeSection arrows={teamServeArrows} report={teamReport.S} />
        </section>

        {/* ── 3. Annahme → Angriff ── */}
        <section>
          <h2 className="mb-3 border-b border-zinc-800 pb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Annahme → Angriff
          </h2>
          <ReceptionAttackSection
            pairs={teamRxPairs}
            rxReport={teamReport.R}
            atkReport={teamReport.A}
          />
        </section>

        {/* ── 4. Block & Abwehr ── */}
        <section>
          <h2 className="mb-3 border-b border-zinc-800 pb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Block & Abwehr
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {(['B', 'D'] as const).map((skill) => {
              const rep = teamReport[skill];
              if (!rep) return (
                <p key={skill} className="text-sm text-zinc-600">
                  Keine {skill === 'B' ? 'Block' : 'Abwehr'}-Daten.
                </p>
              );
              return (
                <div key={skill}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {skill === 'B' ? 'Block' : 'Abwehr (Dig)'}
                  </h3>
                  <table className="border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                        <th className="pb-1 pr-3 text-left">Spieler</th>
                        <th className="px-2 pb-1 text-center">Ges.</th>
                        <th className="px-2 pb-1 text-center text-green-400">#</th>
                        <th className="px-2 pb-1 text-center text-red-400">=</th>
                        <th className="px-2 pb-1 text-center">Eff%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[{ label: 'Gesamt', s: rep.team }, ...[...rep.byPlayer].sort((a, b) => a.playerNumber - b.playerNumber).map((p) => ({ label: `#${p.playerNumber}`, s: p }))].map(({ label, s }) => (
                        <tr key={label} className="border-t border-zinc-800">
                          <td className="py-1 pr-3 font-mono text-xs text-zinc-300">{label}</td>
                          <td className="px-2 py-1 text-center font-mono text-xs text-zinc-200">{s.total}</td>
                          <td className="px-2 py-1 text-center font-mono text-xs text-green-400">{s.excellent}</td>
                          <td className="px-2 py-1 text-center font-mono text-xs text-red-400">{s.error}</td>
                          <td className={cn('px-2 py-1 text-center font-mono text-xs font-semibold',
                            s.efficiency >= 0.3 ? 'text-green-400' : s.efficiency >= 0 ? 'text-yellow-400' : 'text-red-400')}>
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
        </section>

      </div>
    </div>
  );
}
