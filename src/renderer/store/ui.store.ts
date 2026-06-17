import { create } from 'zustand';

const nanoid = () => Math.random().toString(36).slice(2, 11);

export type Layout = 'scout' | 'show' | 'synchronize';
export type TabType = 'home' | 'match' | 'season' | 'team' | 'player' | 'report' | 'scouting';

export interface Tab {
  id: string;
  type: TabType;
  label: string;
  params: Record<string, unknown>;
  isDirty: boolean;
}

interface UIStore {
  tabs: Tab[];
  activeTabId: string | null;
  layout: Layout;
  sidebarOpen: boolean;

  openTab:      (config: Omit<Tab, 'id' | 'isDirty'>) => void;
  closeTab:     (id: string) => void;
  setActiveTab: (id: string) => void;
  setLayout:    (layout: Layout) => void;
  markDirty:    (tabId: string) => void;
  markClean:    (tabId: string) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  tabs: [],
  activeTabId: null,
  layout: 'scout',
  sidebarOpen: true,

  openTab: (config) => {
    const tab: Tab = { ...config, id: nanoid(), isDirty: false };
    set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex(t => t.id === id);
    const next = tabs[idx + 1] ?? tabs[idx - 1];
    set({
      tabs: tabs.filter(t => t.id !== id),
      activeTabId: activeTabId === id ? next.id : activeTabId,
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),
  setLayout:    (layout) => set({ layout }),
  markDirty:    (tabId) => set(s => ({
    tabs: s.tabs.map(t => t.id === tabId ? { ...t, isDirty: true } : t),
  })),
  markClean:    (tabId) => set(s => ({
    tabs: s.tabs.map(t => t.id === tabId ? { ...t, isDirty: false } : t),
  })),
}));
