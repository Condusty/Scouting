import React from 'react';
import { TabBar } from './features/layout/TabBar';
import { Sidebar } from './features/layout/Sidebar';
import { TabContent } from './features/layout/TabContent';
import { useUIStore } from './store/ui.store';

export default function App(): React.ReactElement {
  const { openTab, tabs } = useUIStore();

  React.useEffect(() => {
    if (tabs.length === 0) {
      openTab({ type: 'home', label: 'Home', params: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden">
          <TabContent />
        </main>
      </div>
    </div>
  );
}
