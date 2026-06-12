import React from 'react';
import { useUIStore } from '@renderer/store/ui.store';
import { HomeScreen } from '@renderer/features/home/HomeScreen';
import { SeasonList } from '@renderer/features/seasons/SeasonList';
import { TeamList } from '@renderer/features/teams/TeamList';
import { PlayerList } from '@renderer/features/players/PlayerList';
import { MatchList } from '@renderer/features/matches/MatchList';

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
      return <PlayerList />;
    case 'match':
      return <MatchList />;
    case 'report':
      return (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Reports kommen in Phase 1c.
        </div>
      );
    default:
      return <div className="flex flex-1 items-center justify-center text-zinc-500">Unbekannter Tab</div>;
  }
}
