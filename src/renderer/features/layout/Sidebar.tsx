import React from 'react';
import { Calendar, Users, User, Database, BarChart2, Video } from 'lucide-react';
import { useUIStore } from '../../store/ui.store';
import type { TabType } from '../../store/ui.store';
import { clsx } from 'clsx';

interface NavItem {
  icon: React.ElementType;
  label: string;
  type: TabType;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Calendar,  label: 'Saisons',  type: 'season' },
  { icon: Users,     label: 'Teams',    type: 'team'   },
  { icon: User,      label: 'Spieler',  type: 'player' },
  { icon: Database,  label: 'Spiele',   type: 'match'  },
  { icon: BarChart2, label: 'Reports',  type: 'report' },
  { icon: Video,     label: 'Video',    type: 'match'  },
];

export function Sidebar(): React.ReactElement {
  const { openTab, tabs, activeTabId } = useUIStore();
  const activeType = tabs.find(t => t.id === activeTabId)?.type;

  return (
    <nav className="w-14 bg-zinc-900 border-r border-zinc-700 flex flex-col items-center py-2 gap-0.5 shrink-0">
      {NAV_ITEMS.map(item => (
        <button
          key={item.label}
          title={item.label}
          onClick={() => openTab({ type: item.type, label: item.label, params: {} })}
          className={clsx(
            'w-10 h-10 flex flex-col items-center justify-center rounded gap-0.5 transition-colors',
            'text-[9px] font-medium leading-tight',
            activeType === item.type
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
          )}
        >
          <item.icon size={16} strokeWidth={1.5} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
