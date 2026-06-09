import React from 'react';
import { TabBar } from './features/layout/TabBar';
import { Sidebar } from './features/layout/Sidebar';
import { useUIStore } from './store/ui.store';
import type { Tab } from './store/ui.store';

function TabContent({ tab }: { tab: Tab }): React.ReactElement {
  return (
    <div className="flex-1 overflow-auto p-6 text-zinc-200">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-white mb-1">{tab.label}</h1>
        <p className="text-zinc-500 text-sm">
          Dieser Bereich wird in Phase 1 implementiert.
        </p>
      </div>
    </div>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3">
      <div className="text-5xl">🏐</div>
      <p className="text-sm">Kein Tab offen</p>
    </div>
  );
}

export default function App(): React.ReactElement {
  const { openTab, tabs, activeTabId } = useUIStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  React.useEffect(() => {
    if (tabs.length === 0) {
      openTab({ type: 'home', label: 'Home', params: {} });
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden bg-zinc-900">
          {activeTab ? <TabContent tab={activeTab} /> : <EmptyState />}
        </main>
      </div>
    </div>
  );
}
