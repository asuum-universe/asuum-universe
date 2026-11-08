/**
 * header-tabs-store.ts — V1 CLEAN: Single Chat Tabs Only (No Workspaces)
 * ✅ Security: No sensitive data in tab metadata
 * ✅ All workspace stubs exported for backward compatibility
 */
export interface Tab {
  id: string;
  sessionId: string | null;
  title: string;
  createdAt: number;
  userRenamed: boolean;
  colorIndex: number;
}

export interface TabColor {
  tint: string; tintHover: string; tintActive: string;
  dot: string; border: string; text: string; iconBg: string; accent: string;
}

const TABS_KEY = 'asuum_tabs';
const ACTIVE_TAB_KEY = 'asuum_active_tab';

let tabs: Tab[] = [];
let activeTabId: string | null = null;
const listeners: Array<() => void> = [];

const PALETTE: TabColor[] = [
  { tint: '#f0f9ff', tintHover: '#e0f2fe', tintActive: '#dbeafe', dot: '#0ea5e9', border: '#7dd3fc', text: '#075985', iconBg: '#e0f2fe', accent: '#0284c7' },
  { tint: '#faf5ff', tintHover: '#f3e8ff', tintActive: '#e9d5ff', dot: '#a855f7', border: '#d8b4fe', text: '#581c87', iconBg: '#f3e8ff', accent: '#9333ea' },
  { tint: '#fffbeb', tintHover: '#fef3c7', tintActive: '#fde68a', dot: '#f59e0b', border: '#fcd34d', text: '#78350f', iconBg: '#fef3c7', accent: '#d97706' },
  { tint: '#f0fdf4', tintHover: '#dcfce7', tintActive: '#bbf7d0', dot: '#22c55e', border: '#86efac', text: '#14532d', iconBg: '#dcfce7', accent: '#16a34a' },
  { tint: '#fdf2f8', tintHover: '#fce7f3', tintActive: '#fbcfe8', dot: '#ec4899', border: '#f9a8d4', text: '#831843', iconBg: '#fce7f3', accent: '#db2777' },
  { tint: '#eef2ff', tintHover: '#e0e7ff', tintActive: '#c7d2fe', dot: '#6366f1', border: '#a5b4fc', text: '#312e81', iconBg: '#e0e7ff', accent: '#4f46e5' },
  { tint: '#fff7ed', tintHover: '#ffedd5', tintActive: '#fed7aa', dot: '#f97316', border: '#fdba74', text: '#7c2d12', iconBg: '#ffedd5', accent: '#ea580c' },
  { tint: '#f0fdfa', tintHover: '#ccfbf1', tintActive: '#99f6e4', dot: '#14b8a6', border: '#5eead4', text: '#134e4a', iconBg: '#ccfbf1', accent: '#0d9488' },
  { tint: '#fff1f2', tintHover: '#ffe4e6', tintActive: '#fecdd3', dot: '#f43f5e', border: '#fda4af', text: '#881337', iconBg: '#ffe4e6', accent: '#e11d48' },
  { tint: '#ecfeff', tintHover: '#cffafe', tintActive: '#a5f3fc', dot: '#06b6d4', border: '#67e8f9', text: '#164e63', iconBg: '#cffafe', accent: '#0891b2' },
];

export function getPalette(): TabColor[] { return PALETTE; }

export function getTabColor(tabId: string): TabColor | null {
  const tab = getTabById(tabId);
  if (!tab) return null;
  return PALETTE[tab.colorIndex % PALETTE.length];
}

function nextColorIndex(): number {
  const used = new Set(tabs.map(t => t.colorIndex));
  for (let i = 0; i < PALETTE.length; i++) {
    if (!used.has(i)) return i;
  }
  return tabs.length % PALETTE.length;
}

function loadFromStorage(): void {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    const parsed = raw ? JSON.parse(raw) as Tab[] : [];
    tabs = (Array.isArray(parsed) ? parsed : []).map((t, i) => ({
      ...t,
      userRenamed: t.userRenamed ?? false,
      colorIndex: typeof t.colorIndex === 'number' ? t.colorIndex : i % PALETTE.length,
    }));
  } catch { tabs = []; }
  try { activeTabId = localStorage.getItem(ACTIVE_TAB_KEY); } catch { activeTabId = null; }
}

function persist(): void {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
    if (activeTabId) localStorage.setItem(ACTIVE_TAB_KEY, activeTabId);
    else localStorage.removeItem(ACTIVE_TAB_KEY);
  } catch (e) { console.warn('persist failed', e); }
}

export function onTabsChange(cb: () => void): void { listeners.push(cb); }
function notify(): void { listeners.forEach(cb => cb()); }

export function getAllTabs(): Tab[] { return tabs; }
export function getActiveTab(): Tab | null {
  if (!activeTabId) return null;
  return tabs.find(t => t.id === activeTabId) ?? null;
}
export function getTabById(id: string): Tab | null { return tabs.find(t => t.id === id) ?? null; }
export function getActiveSessionId(): string | null { return getActiveTab()?.sessionId ?? null; }
export function getTabBySessionId(sessionId: string): Tab | null { return tabs.find(t => t.sessionId === sessionId) ?? null; }
export function hasOpenTabs(): boolean { return tabs.length > 0; }
export function getVisibleTabs(): Tab[] { return tabs; }

// ✅ Backward compatibility stubs — prevents import errors in palette-ui etc.
export function setActiveWorkspaceFilter(_wsId: string | null): void { /* no-op in v1 */ }
export function getActiveWorkspaceFilter(): string | null { return null; }
export function getAllWorkspaces(): Array<{ id: string; name: string }> { return []; }
export function getWorkspaceTabs(_wsId: string): Tab[] { return []; }

export function createTab(sessionId: string | null = null, title?: string): Tab {
  const now = Date.now();
  const tab: Tab = {
    id: `tab_${now}_${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    title: title || (sessionId ? 'Chat' : 'New Chat'),
    createdAt: now,
    userRenamed: false,
    colorIndex: nextColorIndex(),
  };
  tabs.push(tab);
  activeTabId = tab.id;
  persist();
  notify();
  return tab;
}

export function switchTab(id: string): void {
  const tab = getTabById(id);
  if (!tab) return;
  activeTabId = id;
  persist();
  notify();
}

export function closeTab(id: string): void {
  const tab = getTabById(id);
  if (!tab) return;
  const index = tabs.findIndex(t => t.id === id);
  tabs.splice(index, 1);
  if (activeTabId === id) {
    if (tabs.length === 0) activeTabId = null;
    else if (index < tabs.length) activeTabId = tabs[index].id;
    else activeTabId = tabs[tabs.length - 1].id;
  }
  persist();
  notify();
}

export function updateTabTitle(id: string, title: string): void {
  const tab = getTabById(id);
  if (!tab) return;
  tab.title = title;
  tab.userRenamed = true;
  persist();
  notify();
}

export function setTabTitleAuto(id: string, title: string): void {
  const tab = getTabById(id);
  if (!tab) return;
  tab.title = title;
  persist();
  notify();
}

export function assignSessionToTab(tabId: string, sessionId: string): void {
  const tab = getTabById(tabId);
  if (!tab) return;
  tab.sessionId = sessionId;
  persist();
  notify();
}

export function closeTabBySessionId(sessionId: string): void {
  const tab = getTabBySessionId(sessionId);
  if (tab) closeTab(tab.id);
}

export function closeAllTabs(): void {
  tabs = [];
  activeTabId = null;
  persist();
  notify();
}

export function hasUserRenamed(tabId: string): boolean {
  return getTabById(tabId)?.userRenamed ?? false;
}

loadFromStorage();