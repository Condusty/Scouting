import React from 'react';
import { Calendar, Users, User, ClipboardList } from 'lucide-react';
import { useUIStore, type TabType } from '@renderer/store/ui.store';

const cards: { type: TabType; label: string; icon: React.ElementType; desc: string }[] = [
  { type: 'season', label: 'Saisons', icon: Calendar, desc: 'Saisons anlegen und verwalten' },
  { type: 'team', label: 'Teams', icon: Users, desc: 'Teams und Kader pflegen' },
  { type: 'player', label: 'Spieler', icon: User, desc: 'Spielerdatenbank' },
  { type: 'match', label: 'Spiele', icon: ClipboardList, desc: 'Spiele anlegen und scouten' },
];

export function HomeScreen() {
  const { openTab } = useUIStore();
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-100">Übersicht</h1>
      </header>
      <div className="grid flex-1 grid-cols-2 content-start gap-4 overflow-auto p-6">
        {cards.map((c) => (
          <button
            key={c.type}
            onClick={() => openTab({ type: c.type, label: c.label, params: {} })}
            className="flex items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
          >
            <div className="rounded-xl bg-sky-600/15 p-3 text-sky-400">
              <c.icon size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{c.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{c.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
