import React from 'react';
import { useUIStore } from '@renderer/store/ui.store';
import { HomeScreen } from '@renderer/features/home/HomeScreen';
import { SeasonList } from '@renderer/features/seasons/SeasonList';
import { TeamList } from '@renderer/features/teams/TeamList';
import { PlayerList } from '@renderer/features/players/PlayerList';
import { MatchList } from '@renderer/features/matches/MatchList';
import { ScoutingView } from '@renderer/features/scouting/ScoutingView';
import { MatchReportView } from '@renderer/features/reports/MatchReportView';

export function TabContent() {
  const { tabs, activeTabId } = useUIStore();
  const active = tabs.find((t) => t.id === activeTabId);

  if (!active) {
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Kein Tab offen</div>;
  }

  switch (active.type) {
    case 'home':
      return <HomeScreen />;
    case 'season':
      return <SeasonList />;
    case 'team':
      return <TeamList />;
    case 'player':
      return <PlayerList teamId={active.params.teamId as number | undefined} />;
    case 'match':
      return <MatchList />;
    case 'scouting':
      return <ScoutingView matchId={active.params.matchId as number} />;
    case 'report':
      return <MatchReportView matchId={active.params.matchId as number} />;
    default:
      return <div className="flex flex-1 items-center justify-center text-zinc-500">Unbekannter Tab</div>;
  }
}
