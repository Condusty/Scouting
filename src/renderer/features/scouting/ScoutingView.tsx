import React, { useEffect, useState } from 'react';
import { useScoutingStore } from '@renderer/store/scouting.store';
import { useUIStore } from '@renderer/store/ui.store';
import { LineupDialog } from '@renderer/features/scouting/LineupDialog';
import { ScoreBoard } from '@renderer/features/scouting/ScoreBoard';
import { RotationDisplay } from '@renderer/features/scouting/RotationDisplay';
import { CommandLine } from '@renderer/features/scouting/CommandLine';
import { RallyLog } from '@renderer/features/scouting/RallyLog';
import { NotationReferenceDialog } from '@renderer/features/scouting/NotationReferenceDialog';
import { Button } from '@renderer/components/ui/Button';

export interface ScoutingViewProps {
  matchId: number;
}

export function ScoutingView({ matchId }: ScoutingViewProps) {
  const session = useScoutingStore((s) => s.session);
  const needsLineup = useScoutingStore((s) => s.needsLineup);
  const error = useScoutingStore((s) => s.error);
  const setCompleted = useScoutingStore((s) => s.setCompleted);
  const setLineup = useScoutingStore((s) => s.setLineup);
  const nextSet = useScoutingStore((s) => s.nextSet);
  const { activeTabId, closeTab } = useUIStore();
  const [helpOpen, setHelpOpen] = useState(false);
  const [prevLineup, setPrevLineup] = useState<{ home: number[]; away: number[] } | null>(null);

  useEffect(() => {
    void useScoutingStore.getState().startSession(matchId);
  }, [matchId]);

  if (session === null) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500">Lade …</div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {error !== null && (
        <div className="bg-red-500/10 px-3 py-1.5 text-xs text-red-400">{error}</div>
      )}

      {needsLineup ? (
        <LineupDialog
          open={true}
          homeRoster={session.homeRoster}
          awayRoster={session.awayRoster}
          previousHomeLineup={prevLineup?.home}
          previousAwayLineup={prevLineup?.away}
          onConfirm={setLineup}
          onCancel={() => activeTabId && closeTab(activeTabId)}
        />
      ) : (
        <>
          <ScoreBoard
            setNumber={session.setNumber}
            homeScore={session.homeScore}
            awayScore={session.awayScore}
            servingTeam={session.servingTeam}
            homeTeamName={session.homeTeamName}
            awayTeamName={session.awayTeamName}
            onOpenHelp={() => setHelpOpen(true)}
          />
          <NotationReferenceDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
          {setCompleted && (
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-700 bg-zinc-800/60 px-4 py-2">
              <span className="text-sm font-semibold text-zinc-100">
                Satz {session.setNumber} —{' '}
                {session.homeScore > session.awayScore
                  ? session.homeTeamName
                  : session.awayTeamName}{' '}
                gewinnt {session.homeScore}:{session.awayScore}
              </span>
              <Button onClick={() => {
                setPrevLineup({ home: session.homeLineup, away: session.awayLineup });
                void nextSet();
              }}>Nächster Satz</Button>
            </div>
          )}
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <RallyLog />
              </div>
              <CommandLine />
            </div>
            <div className="w-64 shrink-0 overflow-y-auto border-l border-zinc-700">
              <RotationDisplay
                homeLineup={session.homeLineup}
                awayLineup={session.awayLineup}
                rotationHome={session.rotationHome}
                rotationAway={session.rotationAway}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
