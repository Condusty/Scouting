import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../src/renderer/store/ui.store';

beforeEach(() => {
  useUIStore.setState({
    tabs: [],
    activeTabId: null,
    layout: 'scout',
    sidebarOpen: true,
  });
});

describe('UIStore tabs', () => {
  it('opens a new tab and makes it active', () => {
    useUIStore.getState().openTab({ type: 'home', label: 'Home', params: {} });
    const state = useUIStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe(state.tabs[0].id);
  });

  it('closes a tab and activates adjacent', () => {
    useUIStore.getState().openTab({ type: 'home', label: 'Home', params: {} });
    useUIStore.getState().openTab({ type: 'season', label: 'Season', params: {} });
    const id1 = useUIStore.getState().tabs[0].id;
    const id2 = useUIStore.getState().tabs[1].id;
    useUIStore.getState().setActiveTab(id2);
    useUIStore.getState().closeTab(id2);
    expect(useUIStore.getState().tabs).toHaveLength(1);
    expect(useUIStore.getState().activeTabId).toBe(id1);
  });

  it('does not close last tab', () => {
    useUIStore.getState().openTab({ type: 'home', label: 'Home', params: {} });
    const id = useUIStore.getState().tabs[0].id;
    useUIStore.getState().closeTab(id);
    expect(useUIStore.getState().tabs).toHaveLength(1);
  });

  it('markDirty sets isDirty on specific tab', () => {
    useUIStore.getState().openTab({ type: 'match', label: 'Match', params: {} });
    const id = useUIStore.getState().tabs[0].id;
    useUIStore.getState().markDirty(id);
    expect(useUIStore.getState().tabs[0].isDirty).toBe(true);
  });

  it('setLayout changes layout', () => {
    useUIStore.getState().setLayout('show');
    expect(useUIStore.getState().layout).toBe('show');
  });
});
