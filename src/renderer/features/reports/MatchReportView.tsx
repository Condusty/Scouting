import React from 'react';
import type { TeamSide } from '@shared/types';
import { useReportStore } from '@renderer/store/report.store';
import { SkillStatsTable } from './SkillStatsTable';
import { ServeDirectionChart } from './ServeDirectionChart';
import { cn } from '@renderer/lib/cn';

export function MatchReportView({ matchId }: { matchId: number }) {
  const { reportData, serveFlowsHome, serveFlowsAway, loading, error, load } = useReportStore();
  const [team, setTeam] = React.useState<TeamSide>('home');

  React.useEffect(() => {
    void load(matchId);
  }, [matchId]);

  if (loading)
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Lade …</div>;
  if (error)
    return <div className="flex flex-1 items-center justify-center text-red-400">{error}</div>;
  if (!reportData) return null;

  const teamReport = team === 'home' ? reportData.home : reportData.away;
  const flows = team === 'home' ? serveFlowsHome : serveFlowsAway;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* set scores */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-700 bg-zinc-800/60 px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sätze:</span>
        {reportData.setScores.length === 0 && <span className="text-sm text-zinc-500">—</span>}
        {reportData.setScores.map((s) => (
          <span key={s.setNumber} className="rounded bg-zinc-700 px-2 py-0.5 font-mono text-xs text-zinc-200">
            {s.setNumber}. Satz &nbsp;{s.homeScore}:{s.awayScore}
          </span>
        ))}
      </div>

      {/* team toggle */}
      <div className="flex shrink-0 gap-2 border-b border-zinc-700 px-4 py-2">
        {(['home', 'away'] as TeamSide[]).map((t) => (
          <button
            key={t}
            onClick={() => setTeam(t)}
            className={cn(
              'no-drag rounded-md px-3 py-1 text-sm font-medium transition-colors',
              team === t
                ? 'bg-sky-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200',
            )}
          >
            {t === 'home' ? 'Heim' : 'Gast'}
          </button>
        ))}
      </div>

      {/* content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          <SkillStatsTable report={teamReport} />
        </div>
        <div className="w-72 shrink-0 overflow-y-auto border-l border-zinc-700 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">Aufschlagrichtung</h3>
          <ServeDirectionChart flows={flows} />
        </div>
      </div>
    </div>
  );
}
