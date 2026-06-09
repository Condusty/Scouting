import React from 'react';
import { X } from 'lucide-react';
import { useUIStore } from '../../store/ui.store';
import { clsx } from 'clsx';

export function TabBar(): React.ReactElement {
  const { tabs, activeTabId, openTab, closeTab, setActiveTab } = useUIStore();

  return (
    <div className="flex items-center bg-zinc-900 border-b border-zinc-700 overflow-x-auto h-9 shrink-0 select-none">
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={clsx(
            'flex items-center gap-1.5 px-3 h-full text-xs cursor-pointer border-r border-zinc-700 shrink-0 max-w-[180px] min-w-[80px]',
            activeTabId === tab.id
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          )}
        >
          <span className="truncate flex-1">
            {tab.isDirty ? `${tab.label} •` : tab.label}
          </span>
          {tabs.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
              className="hover:text-white opacity-50 hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-zinc-600"
            >
              <X size={10} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => openTab({ type: 'home', label: 'Home', params: {} })}
        className="px-3 h-full text-zinc-500 hover:text-white hover:bg-zinc-800 text-base leading-none shrink-0"
        title="Neuer Tab"
      >
        +
      </button>
    </div>
  );
}
