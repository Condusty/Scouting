import React, { useEffect } from 'react';
import { useScoutingStore } from '@renderer/store/scouting.store';
import { useUIStore } from '@renderer/store/ui.store';
import { LineupDialog } from '@renderer/features/scouting/LineupDialog';
import { ScoreBoard } from '@renderer/features/scouting/ScoreBoard';
import { RotationDisplay } from '@renderer/features/scouting/RotationDisplay';
import { CommandLine } from '@renderer/features/scouting/CommandLine';
import { RallyLog } from '@renderer/features/scouting/RallyLog';

export interface ScoutingViewProps {
  matchId: number;
}

export function ScoutingView({ matchId }: ScoutingViewProps) {
  const session = useScoutingStore((s) => s.session);
  const needsLineup = useScoutingStore((s) => s.needsLineup);
  const initialState = useScoutingStore((s) => s.initialState);
  const error = useScoutingStore((s) => s.error);
  const setLineup = useScoutingStore((s) => s.setLineup);
  const { activeTabId, closeTab } = useUIStore();

  useEffect(() => {
    void useScoutingStore.getState().startSession(matchId, 1);
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
          />
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
