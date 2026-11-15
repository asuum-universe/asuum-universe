/**
 * sidebar-ui.ts — SINGLE CONTROLLER (desktop + mobile)
 *
 * Owns: DOM, state, rendering, menus, theme, open/close policy, scrim,
 *       and the collapsed-rail Chats shortcut + flyout.
 * Delegates: touch drag → sidebar-gestures.ts (destroyable).
 *
 * DESKTOP
 *   Icons are position-locked (CSS) — only text slides on toggle.
 *   Collapsed rail shows a Chats shortcut → flyout with the full flat list.
 * MOBILE
 *   Drawer. Outside tap / scrim / Escape closes. Chat click auto-closes.
 *   Swipe open/close with live scrim. Rail shortcut hidden.
 *
 * Re-init safe: listeners bound to an AbortController aborted before re-init.
 */
import { getAllSessions, onHistoryChange, loadSession, startNewChat, getCurrentSession, renameSession, deleteSession } from '../../chat-screen/services/chat-store';
import { getAllTabs, closeTab, setActiveWorkspaceFilter, onTabsChange } from '../../header/services/header-tabs-store';
import { setExplicitNewTabClicked, clearInjectedColor } from '../../welcome-screen/welcome-ts/welcome-ui';
import { initSidebarGestures } from './sidebar-gestures';

/* ───────────────────────── STATE ───────────────────────── */
let sidebarEl: HTMLElement | null = null;
let scrimEl: HTMLElement | null = null;
let menuEl: HTMLElement | null = null;
let menuAnchor: HTMLElement | null = null;
let bulkMenuEl: HTMLElement | null = null;
let selectionMode = false;
const selectedIds = new Set<string>();
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let repositionRaf: number | null = null;
let suppressUntil = 0;
let lastToggleAt = 0;
let scrimHideTimer: ReturnType<typeof setTimeout> | null = null;
let controller: AbortController | null = null;
let destroyGestures: (() => void) | null = null;

/* Rail Chats shortcut */
let railBtnEl: HTMLButtonElement | null = null;
let railPopEl: HTMLElement | null = null;
let railPopListEl: HTMLElement | null = null;
let railCountEl: HTMLElement | null = null;
let railPopOpen = false;
let railPinned = false;
let railOpenTimer: ReturnType<typeof setTimeout> | null = null;
let railCloseTimer: ReturnType<typeof setTimeout> | null = null;
let railMenuEl: HTMLElement | null = null;
let railMenuAnchor: HTMLElement | null = null;
let railRepositionRaf: number | null = null;

const THEME_KEY = 'asuum_sidebar_theme';
const MOBILE_BP = 768;
const NARROW_BP = 380;
const SCRIM_FADE_MS = 320;
const RAIL_HOVER_OPEN_MS = 140;
const RAIL_HOVER_CLOSE_MS = 260;

/* ───────────────────────── ICONS ───────────────────────── */
const ICON_DOTS = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>`;
const ICON_RENAME = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
const ICON_DELETE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const ICON_SAVE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_CANCEL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_TICK_SM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_UNTICK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/></svg>`;
const ICON_TRASH_LG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

/* ───────────────────────── HELPERS ───────────────────────── */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function isMobile(): boolean { return window.innerWidth <= MOBILE_BP; }
function isOpen(): boolean {
  const sb = sidebarEl;
  return !!sb && sb.classList.contains('expanded');
}
function isRailMode(): boolean { return !isMobile() && !isOpen(); }
function fallbackWidth(): number {
  if (window.innerWidth <= NARROW_BP) return 264;
  if (isMobile()) return 276;
  return 228;
}
function drawerWidth(): number {
  const sb = sidebarEl;
  if (!sb) return fallbackWidth();
  const w = Math.round(sb.getBoundingClientRect().width);
  return w > 0 ? w : fallbackWidth();
}
function clearLongPress(): void {
  if (longPressTimer !== null) { clearTimeout(longPressTimer); longPressTimer = null; }
}
function sortedSessions() {
  return [...getAllSessions()].sort((a, b) => b.updatedAt - a.updatedAt);
}
function sessionTitle(id: string): string {
  return getAllSessions().find(s => s.id === id)?.title ?? '';
}

/* ───────────────────────── THEME ───────────────────────── */
function storedTheme(): 'dark' | 'light' | null {
  try { return localStorage.getItem(THEME_KEY) as 'dark' | 'light' | null; } catch { return null; }
}
function applyTheme(theme: 'dark' | 'light'): void {
  document.body.classList.toggle('sidebar-light', theme === 'light');
}
function toggleTheme(): void {
  const next = document.body.classList.contains('sidebar-light') ? 'dark' : 'light';
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* blocked */ }
}

/* ───────────────────────── SCRIM ───────────────────────── */
function ensureScrim(): HTMLElement {
  if (scrimEl) return scrimEl;
  const el = document.createElement('div');
  el.className = 'sidebar-mobile-overlay';
  el.setAttribute('aria-hidden', 'true');
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isMobile()) return;
    if (Date.now() < suppressUntil) return;
    closeSidebar();
  });
  document.body.appendChild(el);
  scrimEl = el;
  return el;
}
function syncScrim(): void {
  const el = scrimEl;
  if (!el) return;
  el.style.left = '0px';
  el.style.right = '0px';
  el.style.top = '0px';
  el.style.bottom = '0px';
}
function cancelScrimHide(): void {
  if (scrimHideTimer !== null) { clearTimeout(scrimHideTimer); scrimHideTimer = null; }
}
function showScrim(): void {
  if (!isMobile()) { hideScrim(); return; }
  const el = ensureScrim();
  cancelScrimHide();
  syncScrim();
  el.classList.remove('dragging');
  el.style.display = 'block';
  el.style.pointerEvents = '';
  requestAnimationFrame(() => {
    el.classList.add('visible');
    el.style.opacity = '1';
  });
}
function hideScrim(): void {
  const el = scrimEl;
  if (!el) return;
  cancelScrimHide();
  el.classList.remove('dragging', 'visible');
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  scrimHideTimer = setTimeout(() => {
    scrimHideTimer = null;
    if (!el.classList.contains('visible')) el.style.display = 'none';
  }, SCRIM_FADE_MS);
}
function setScrimProgress(progress: number): void {
  if (!isMobile()) return;
  const el = ensureScrim();
  cancelScrimHide();
  syncScrim();
  const p = Math.max(0, Math.min(1, progress));
  el.classList.add('dragging');
  el.classList.remove('visible');
  el.style.display = 'block';
  el.style.pointerEvents = 'none';
  el.style.opacity = p.toFixed(3);
}

/* ───────────────────── OPEN / CLOSE ───────────────────── */
function syncToggleAria(): void {
  const btn = document.getElementById('sidebarToggle');
  if (!btn) return;
  const open = isOpen();
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Collapse sidebar' : 'Expand sidebar');
  btn.title = open ? 'Collapse sidebar' : 'Expand sidebar';
}
function openSidebar(): void {
  const sb = sidebarEl;
  if (!sb) return;
  closeRailPop(true);
  sb.style.transition = '';
  sb.style.transform = '';
  sb.classList.remove('dragging');
  sb.classList.add('expanded');
  syncToggleAria();
  if (isMobile()) showScrim(); else hideScrim();
}
function closeSidebar(): void {
  const sb = sidebarEl;
  if (!sb) return;
  closeMenu();
  closeBulkMenu();
  closeRailItemMenu();
  if (selectionMode) { selectionMode = false; selectedIds.clear(); renderAll(); }
  sb.style.transition = '';
  sb.style.transform = '';
  sb.classList.remove('dragging', 'expanded');
  syncToggleAria();
  hideScrim();
  if (isRailMode()) renderRailChats();
}
function toggleSidebar(): void {
  const now = Date.now();
  if (now - lastToggleAt < 200) return;
  lastToggleAt = now;
  if (isOpen()) closeSidebar(); else openSidebar();
}

/* ───────────────────────── INIT ───────────────────────── */
export function initializeSidebarUI(): void {
  const sb = document.getElementById('sidebar');
  if (!sb) return;

  controller?.abort();
  destroyGestures?.();
  controller = new AbortController();
  const signal = controller.signal;

  sidebarEl = sb;
  console.log('📋 Sidebar UI (still icons · rail chats flyout · live scrim)');

  applyTheme(storedTheme() || 'dark');

  document.getElementById('sidebarOverlay')?.remove();
  document.querySelector('.sidebar-overlay')?.remove();
  document.getElementById('sidebarCloseBtn')?.remove();
  document.querySelector('.sidebar-close-btn')?.remove();

  ensureScrim();
  ensureRailChats(signal);
  syncToggleAria();

  destroyGestures = initSidebarGestures({
    isMobile,
    isOpen,
    getSidebar: () => sidebarEl,
    getScrim: () => scrimEl,
    getWidth: drawerWidth,
    syncScrim,
    setScrimProgress,
    onDragStart: () => { closeMenu(); closeBulkMenu(); },
    open: openSidebar,
    close: closeSidebar,
    suppressClicks: (ms) => { suppressUntil = Date.now() + ms; }
  });

  const onToggle = (e: Event): void => {
    const t = e.target as HTMLElement | null;
    if (!t || !t.closest('#sidebarToggle,.sb-toggle-btn')) return;
    e.stopPropagation();
    e.preventDefault();
    toggleSidebar();
  };
  document.addEventListener('pointerup', onToggle, { capture: true, signal });
  document.addEventListener('click', onToggle, { capture: true, signal });
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (!t || !t.closest('#sidebarToggle,.sb-toggle-btn')) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleSidebar(); }
  }, { capture: true, signal });

  const dismissPopups = (e: Event): void => {
    if (Date.now() < suppressUntil) return;
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const row = menuEl;
    const bulk = bulkMenuEl;
    if (row && !row.contains(t) && !t.closest('.chat-item-menu')) closeMenu();
    if (bulk && !bulk.contains(t) && !t.closest('.bb-dots')) closeBulkMenu();
    if (railMenuEl && !railMenuEl.contains(t) && !t.closest('.chat-item-menu')) closeRailItemMenu();
    if (railPopOpen && !railPinned) {
      const inBtn = railBtnEl?.contains(t);
      const inPop = railPopEl?.contains(t);
      const inMenu = railMenuEl?.contains(t);
      if (!inBtn && !inPop && !inMenu) closeRailPop();
    }
  };
  document.addEventListener('pointerdown', dismissPopups, { capture: true, signal });
  document.addEventListener('touchstart', dismissPopups, { capture: true, passive: true, signal });

  const guard = (e: Event): void => { e.stopPropagation(); };
  sb.addEventListener('mousedown', guard, { signal });
  sb.addEventListener('touchstart', guard, { passive: true, signal });
  sb.addEventListener('click', guard, { signal });

  document.getElementById('sbThemeToggle')?.addEventListener('click', (e) => {
    e.stopPropagation(); toggleTheme();
  }, { signal });

  document.querySelector('.new-chat-btn')?.addEventListener('click', (e) => {
    e.stopPropagation(); handleNewChat();
  }, { signal });

  renderAll();
  renderRailChats();
  onHistoryChange(() => { if (!selectionMode) renderAll(); renderRailChats(); });
  onTabsChange(() => { if (!selectionMode) renderAll(); renderRailChats(); });

  document.addEventListener('click', (e: Event) => {
    if (railPopOpen && railPinned) {
      const t = e.target as HTMLElement | null;
      const inBtn = t && railBtnEl?.contains(t);
      const inPop = t && railPopEl?.contains(t);
      const inMenu = t && railMenuEl?.contains(t);
      if (!inBtn && !inPop && !inMenu) closeRailPop(true);
    }
    if (!isMobile()) return;
    if (Date.now() < suppressUntil) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('#sidebarToggle,.sb-toggle-btn')) return;
    const host = sidebarEl;
    if (host && host.contains(target)) return;
    if (menuEl && menuEl.contains(target)) return;
    if (bulkMenuEl && bulkMenuEl.contains(target)) return;
    if (scrimEl && scrimEl.contains(target)) return;
    if (target.closest('.cr-overlay,.mh-overlay,.mm-wrap')) return;
    if (isOpen()) closeSidebar();
  }, { signal });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (railMenuEl) { closeRailItemMenu(); return; }
    if (railPopOpen) { closeRailPop(true); return; }
    if (menuEl) { closeMenu(); return; }
    if (bulkMenuEl) { closeBulkMenu(); return; }
    if (selectionMode) { exitSelectionMode(); return; }
    if (isMobile() && isOpen()) closeSidebar();
  }, { signal });

  document.querySelector('.sidebar-content')?.addEventListener('scroll', scheduleReposition, { capture: true, passive: true, signal });

  window.addEventListener('resize', () => {
    syncScrim();
    if (!isMobile()) hideScrim();
    else if (isOpen()) showScrim();
    if (isRailMode()) { renderRailChats(); if (railPopOpen) scheduleRailReposition(); }
    else closeRailPop(true);
    scheduleReposition();
    scheduleRailReposition();
  }, { signal });

  window.addEventListener('orientationchange', () => {
    syncScrim();
    scheduleReposition();
    scheduleRailReposition();
  }, { signal });
}

export function destroySidebarUI(): void {
  controller?.abort();
  controller = null;
  destroyGestures?.();
  destroyGestures = null;
  closeMenu();
  closeBulkMenu();
  closeRailItemMenu();
  closeRailPop(true);
  clearLongPress();
  cancelScrimHide();
  clearRailTimers();
  railBtnEl?.remove();
  railBtnEl = null;
  railPopEl?.remove();
  railPopEl = null;
  railPopListEl = null;
  railCountEl = null;
  scrimEl?.remove();
  scrimEl = null;
  sidebarEl = null;
}

/* ───────────────────────── NEW CHAT ───────────────────────── */
function handleNewChat(): void {
  if (selectionMode) exitSelectionMode();
  closeRailPop(true);
  if (isMobile()) closeSidebar();
  else { closeMenu(); closeBulkMenu(); }
  startNewChat();
  setExplicitNewTabClicked(false);
  clearInjectedColor();
  setActiveWorkspaceFilter(null);
  document.dispatchEvent(new Event('asuum:welcome-mode'));
  document.getElementById('mainPanel')?.classList.remove('chat-active', 'has-tabs', 'new-tab-mode');
  const inp = document.querySelector('.chat-input') as HTMLTextAreaElement | null;
  if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input')); inp.focus(); }
}

/* ───────────────────── SELECTION MODE ───────────────────── */
function enterSelectionMode(): void { selectionMode = true; selectedIds.clear(); closeMenu(); closeRailPop(true); renderAll(); }
function exitSelectionMode(): void { selectionMode = false; selectedIds.clear(); closeBulkMenu(); renderAll(); }

function toggleSelect(id: string): void {
  if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
  updateSelectionUI();
}
function updateSelectionUI(): void {
  const content = document.querySelector('.sidebar-content');
  if (!content) return;
  content.querySelectorAll('.chat-item').forEach(node => {
    const el = node as HTMLElement;
    const id = el.dataset.id ?? '';
    const cb = el.querySelector('.select-circle') as HTMLElement | null;
    const on = selectedIds.has(id);
    if (cb) { cb.classList.toggle('checked', on); cb.innerHTML = on ? ICON_CHECK : ''; }
    el.classList.toggle('selected', on);
  });
  const n = selectedIds.size;
  const countEl = document.getElementById('bulkCount');
  if (countEl) {
    countEl.textContent = n === 0 ? 'None' : String(n);
    countEl.setAttribute('aria-label', `${n} chat${n === 1 ? '' : 's'} selected`);
  }
  const del = document.getElementById('bulkDeleteBtn') as HTMLButtonElement | null;
  if (del) {
    const has = n > 0;
    del.style.opacity = has ? '1' : '0.34';
    del.style.pointerEvents = has ? 'auto' : 'none';
    del.disabled = !has;
  }
}
function collectIds(): string[] {
  const out: string[] = [];
  document.querySelectorAll('.chat-item').forEach(node => {
    const id = (node as HTMLElement).dataset.id;
    if (id) out.push(id);
  });
  return out;
}
function allSelected(): boolean {
  const ids = collectIds();
  return ids.length > 0 && ids.every(id => selectedIds.has(id));
}
function toggleSelectAll(): void {
  const ids = collectIds();
  if (allSelected()) selectedIds.clear();
  else ids.forEach(id => selectedIds.add(id));
  updateSelectionUI();
  closeBulkMenu();
}

/* ───────────────────────── BULK MENU ───────────────────────── */
function openBulkMenu(anchor: HTMLElement): void {
  closeBulkMenu(); closeMenu();
  const sb = sidebarEl;
  if (!sb) return;

  const pop = document.createElement('div');
  pop.className = 'bulk-dropdown';
  pop.setAttribute('role', 'menu');
  pop.innerHTML = allSelected()
    ? `<button class="bulk-dropdown-item" type="button" role="menuitem">${ICON_UNTICK}<span>Clear selection</span></button>`
    : `<button class="bulk-dropdown-item" type="button" role="menuitem">${ICON_TICK_SM}<span>Select all chats</span></button>`;
  sb.appendChild(pop);
  bulkMenuEl = pop;

  const host = sb.getBoundingClientRect();
  const r = anchor.getBoundingClientRect();
  const mw = pop.offsetWidth || 170;
  const mh = pop.offsetHeight || 40;
  const left = Math.max(8, Math.min(r.right - host.left - mw, host.width - mw - 8));
  let top = r.bottom - host.top + 4;
  if (top + mh > host.height - 8) top = r.top - host.top - mh - 4;
  pop.style.left = `${left}px`;
  pop.style.top = `${Math.max(8, top)}px`;
  requestAnimationFrame(() => { pop.classList.add('visible'); });

  pop.addEventListener('click', (e) => e.stopPropagation());
  pop.querySelector('.bulk-dropdown-item')?.addEventListener('click', (e) => { e.stopPropagation(); toggleSelectAll(); });
}
function closeBulkMenu(): void {
  bulkMenuEl?.remove();
  bulkMenuEl = null;
}

/* ───────────────────── DELETE CONFIRM ───────────────────── */
function showDeleteConfirmation(): void {
  const count = selectedIds.size;
  if (count === 0) return;
  closeBulkMenu();

  const overlay = document.createElement('div');
  overlay.className = 'bulk-delete-overlay';
  overlay.innerHTML = `<div class="bulk-delete-modal" role="dialog" aria-modal="true"><div class="bdm-icon-wrap">${ICON_TRASH_LG}</div><h3 class="bdm-title">Delete ${count} chat${count > 1 ? 's' : ''}?</h3><p class="bdm-desc">This permanently removes ${count === 1 ? 'this conversation' : 'these conversations'} and cannot be undone.</p><div class="bdm-actions"><button class="bdm-btn bdm-cancel" type="button">Cancel</button><button class="bdm-btn bdm-confirm" type="button">Delete ${count > 1 ? 'all' : 'chat'}</button></div></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.classList.add('visible'); });

  const ac = new AbortController();
  const dismiss = (): void => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
    ac.abort();
  };
  overlay.addEventListener('click', (e) => { e.stopPropagation(); if (e.target === overlay) dismiss(); }, { signal: ac.signal });
  overlay.querySelector('.bdm-cancel')?.addEventListener('click', (e) => { e.stopPropagation(); dismiss(); }, { signal: ac.signal });
  overlay.querySelector('.bdm-confirm')?.addEventListener('click', (e) => { e.stopPropagation(); executeBulkDelete(); dismiss(); }, { signal: ac.signal });
  document.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); }, { signal: ac.signal });
  (overlay.querySelector('.bdm-cancel') as HTMLButtonElement | null)?.focus();
}
function executeBulkDelete(): void {
  Array.from(selectedIds).forEach(id => {
    getAllTabs().filter(t => t.sessionId === id).forEach(tab => closeTab(tab.id));
    deleteSession(id);
  });
  exitSelectionMode();
  renderAll();
  renderRailChats();
  if (!getCurrentSession()) document.dispatchEvent(new Event('asuum:welcome-mode'));
}

/* ───────────────────────── RAIL CHATS SHORTCUT ───────────────────────── */
function clearRailTimers(): void {
  if (railOpenTimer !== null) { clearTimeout(railOpenTimer); railOpenTimer = null; }
  if (railCloseTimer !== null) { clearTimeout(railCloseTimer); railCloseTimer = null; }
}
function ensureRailChats(signal: AbortSignal): void {
  const sb = sidebarEl;
  if (!sb) return;
  const middle = sb.querySelector('.sb-middle');
  const content = sb.querySelector('.sidebar-content');
  if (!middle || !content) return;

  if (!railBtnEl || !sb.contains(railBtnEl)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sb-rail-chats-btn';
    btn.title = 'Chats';
    btn.setAttribute('aria-label', 'Open chats list');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `${ICON_CHAT}<span class="sb-rail-chats-count empty">0</span>`;
    middle.insertBefore(btn, content);
    railBtnEl = btn;
    railCountEl = btn.querySelector('.sb-rail-chats-count');
  }

  if (!railPopEl || !document.body.contains(railPopEl)) {
    const pop = document.createElement('div');
    pop.className = 'rail-chats-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Chats');
    pop.innerHTML = `<div class="rail-chats-pop-list" role="listbox" aria-label="All chats"></div>`;
    document.body.appendChild(pop);
    railPopEl = pop;
    railPopListEl = pop.querySelector('.rail-chats-pop-list');
  }

  const btn = railBtnEl;
  const pop = railPopEl;
  if (!btn || !pop) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isRailMode()) return;
    if (railPopOpen && railPinned) closeRailPop(true);
    else { railPinned = true; openRailPop(); }
  }, { signal });

  btn.addEventListener('mouseenter', () => {
    if (!isRailMode()) return;
    if (railCloseTimer !== null) { clearTimeout(railCloseTimer); railCloseTimer = null; }
    if (railPopOpen) return;
    railOpenTimer = setTimeout(() => { railOpenTimer = null; openRailPop(); }, RAIL_HOVER_OPEN_MS);
  }, { signal });

  btn.addEventListener('mouseleave', () => {
    if (railOpenTimer !== null) { clearTimeout(railOpenTimer); railOpenTimer = null; }
    if (!railPopOpen || railPinned) return;
    railCloseTimer = setTimeout(() => { railCloseTimer = null; closeRailPop(); }, RAIL_HOVER_CLOSE_MS);
  }, { signal });

  pop.addEventListener('mouseenter', () => {
    if (railCloseTimer !== null) { clearTimeout(railCloseTimer); railCloseTimer = null; }
  }, { signal });

  pop.addEventListener('mouseleave', () => {
    if (!railPopOpen || railPinned || railMenuEl) return;
    railCloseTimer = setTimeout(() => { railCloseTimer = null; closeRailPop(); }, RAIL_HOVER_CLOSE_MS);
  }, { signal });

  pop.addEventListener('click', (e) => e.stopPropagation(), { signal });
  pop.addEventListener('scroll', scheduleRailReposition, { capture: true, passive: true, signal });
}

function renderRailChats(): void {
  const list = railPopListEl;
  const count = railCountEl;
  if (!list || !count) return;

  const sessions = sortedSessions();
  const activeId = getCurrentSession()?.id ?? null;
  const n = sessions.length;

  count.textContent = n > 99 ? '99+' : String(n);
  count.classList.toggle('empty', n === 0);

  if (n === 0) {
    list.innerHTML = `<div class="sidebar-empty-state"><span class="ses-icon">${ICON_CHAT}</span><span>No chats yet</span><span class="ses-hint">Start a new conversation</span></div>`;
    return;
  }

  let html = '';
  for (const s of sessions) {
    const active = s.id === activeId ? ' active' : '';
    html += `<div class="chat-item${active}" data-id="${esc(s.id)}" role="option" aria-selected="${active ? 'true' : 'false'}"><span class="chat-item-icon">${ICON_CHAT}</span><span class="chat-item-title">${esc(s.title)}</span><button class="chat-item-menu" type="button" title="Chat options" aria-label="Chat options">${ICON_DOTS}</button></div>`;
  }
  list.innerHTML = html;

  list.querySelectorAll('.chat-item').forEach(node => {
    const el = node as HTMLElement;
    const id = el.dataset.id;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = e.target as HTMLElement | null;
      if (t && t.closest('.chat-item-menu')) return;
      if (!id) return;
      setActiveWorkspaceFilter(null);
      loadSession(id);
      closeRailPop(true);
    });
  });

  list.querySelectorAll('.chat-item-menu').forEach(node => {
    node.addEventListener('click', (e) => {
      e.stopImmediatePropagation(); e.preventDefault();
      const anchor = node as HTMLElement;
      const row = anchor.closest('.chat-item') as HTMLElement | null;
      const id = row?.dataset.id;
      if (!id) return;
      if (railMenuEl && railMenuAnchor === anchor) { closeRailItemMenu(); return; }
      openRailItemMenu(anchor, id, sessionTitle(id));
    });
  });

  if (railPopOpen) positionRailPop();
}

function positionRailPop(): void {
  const btn = railBtnEl, pop = railPopEl;
  if (!btn || !pop) return;
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth || 264;
  const h = pop.offsetHeight || 320;
  const gap = 10;
  let left = r.right + gap;
  if (left + w > window.innerWidth - 12) left = Math.max(12, r.left - w - gap);
  let top = r.top - 6;
  if (top + h > window.innerHeight - 12) top = window.innerHeight - h - 12;
  if (top < 12) top = 12;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}
function scheduleRailReposition(): void {
  if (!railPopOpen || railRepositionRaf !== null) return;
  railRepositionRaf = requestAnimationFrame(() => { railRepositionRaf = null; positionRailPop(); });
}

function openRailPop(): void {
  if (!isRailMode()) return;
  const btn = railBtnEl, pop = railPopEl;
  if (!btn || !pop) return;
  clearRailTimers();
  closeMenu();
  closeBulkMenu();
  closeRailItemMenu();
  renderRailChats();
  railPopOpen = true;
  btn.classList.add('active');
  btn.setAttribute('aria-expanded', 'true');
  positionRailPop();
  requestAnimationFrame(() => {
    pop.classList.add('open');
    positionRailPop();
  });
}
function closeRailPop(force = false): void {
  clearRailTimers();
  if (force) railPinned = false;
  closeRailItemMenu();
  const btn = railBtnEl, pop = railPopEl;
  railPopOpen = false;
  if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-expanded', 'false'); }
  if (pop) pop.classList.remove('open');
}

/* Fixed-position row menu for flyout items (sidebar-relative math would clip). */
function openRailItemMenu(anchor: HTMLElement, id: string, title: string): void {
  closeRailItemMenu();
  railMenuAnchor = anchor;
  anchor.closest('.chat-item')?.classList.add('menu-open');

  const pop = document.createElement('div');
  pop.className = 'chat-menu fixed';
  pop.setAttribute('role', 'menu');
  pop.innerHTML = `<button class="chat-menu-btn rename-btn" type="button" role="menuitem">${ICON_RENAME}<span>Rename</span></button><button class="chat-menu-btn delete-btn" type="button" role="menuitem">${ICON_DELETE}<span>Delete</span></button>`;
  document.body.appendChild(pop);
  railMenuEl = pop;
  positionRailItemMenu();

  pop.addEventListener('click', (e) => e.stopPropagation());
  pop.addEventListener('mousedown', (e) => e.stopPropagation());

  pop.querySelector('.rename-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.innerHTML = `<div class="chat-menu-rename"><input class="chat-menu-input" type="text" value="${esc(title)}" maxlength="42" aria-label="Chat name"/><div class="chat-menu-rename-actions"><button class="rename-save" type="button" title="Save">${ICON_SAVE}</button><button class="rename-cancel" type="button" title="Cancel">${ICON_CANCEL}</button></div></div>`;
    positionRailItemMenu();
    const input = pop.querySelector('.chat-menu-input') as HTMLInputElement | null;
    if (!input) return;
    input.focus(); input.select();
    const save = (): void => {
      const v = input.value.trim();
      if (v) renameSession(id, v);
      closeRailItemMenu();
      renderAll();
      renderRailChats();
    };
    pop.querySelector('.rename-save')?.addEventListener('click', (ev) => { ev.stopPropagation(); save(); });
    pop.querySelector('.rename-cancel')?.addEventListener('click', (ev) => { ev.stopPropagation(); closeRailItemMenu(); });
    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') { ev.preventDefault(); save(); }
      if (ev.key === 'Escape') { ev.preventDefault(); closeRailItemMenu(); }
    });
    input.addEventListener('click', (ev) => ev.stopPropagation());
  });

  pop.querySelector('.delete-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    getAllTabs().filter(t => t.sessionId === id).forEach(tab => closeTab(tab.id));
    deleteSession(id);
    closeRailItemMenu();
    renderAll();
    renderRailChats();
    if (!getCurrentSession()) document.dispatchEvent(new Event('asuum:welcome-mode'));
  });
}
function positionRailItemMenu(): void {
  const pop = railMenuEl, anchor = railMenuAnchor;
  if (!pop || !anchor) return;
  if (!document.body.contains(anchor)) { closeRailItemMenu(); return; }
  const r = anchor.getBoundingClientRect();
  const mw = pop.offsetWidth || 158;
  const mh = pop.offsetHeight || 80;
  let left = r.right - mw;
  if (left < 8) left = 8;
  if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
  let top = r.top - mh - 4;
  if (top < 8) top = r.bottom + 4;
  if (top + mh > window.innerHeight - 8) top = window.innerHeight - mh - 8;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}
function closeRailItemMenu(): void {
  railMenuAnchor?.closest('.chat-item')?.classList.remove('menu-open');
  railMenuEl?.remove();
  railMenuEl = null;
  railMenuAnchor = null;
}

/* ───────────────────────── RENDER (expanded list) ───────────────────────── */
function renderAll(): void {
  const content = document.querySelector('.sidebar-content');
  if (!content) return;
  closeMenu();

  const sorted = sortedSessions();
  const activeId = getCurrentSession()?.id ?? null;

  let html = '';
  if (selectionMode) {
    html += `<div class="bulk-bar-sticky"><button class="bb-cancel" id="bulkCancelBtn" type="button">Cancel</button><span class="bb-count" id="bulkCount">0</span><button class="bb-delete" id="bulkDeleteBtn" type="button" title="Delete selected">${ICON_DELETE}<span class="bb-delete-text">Delete</span></button><button class="bb-dots" id="bulkDotsBtn" type="button" title="Selection options" aria-label="Selection options">${ICON_DOTS}</button></div>`;
  }

  html += `<div class="chat-list-area" role="listbox" aria-label="Chats" aria-multiselectable="${selectionMode}">`;
  if (sorted.length > 0) {
    html += `<div class="chat-group">`;
    for (const s of sorted) {
      const active = !selectionMode && s.id === activeId ? ' active' : '';
      const checked = selectionMode && selectedIds.has(s.id);
      html += selectionMode
        ? `<div class="chat-item${checked ? ' selected' : ''}" data-id="${esc(s.id)}" role="option" aria-selected="${checked}"><span class="select-circle${checked ? ' checked' : ''}">${checked ? ICON_CHECK : ''}</span><span class="chat-item-icon">${ICON_CHAT}</span><span class="chat-item-title">${esc(s.title)}</span></div>`
        : `<div class="chat-item${active}" data-id="${esc(s.id)}" role="option" aria-selected="${active ? 'true' : 'false'}"><span class="chat-item-icon">${ICON_CHAT}</span><span class="chat-item-title">${esc(s.title)}</span><button class="chat-item-menu" type="button" title="Chat options" aria-label="Chat options">${ICON_DOTS}</button></div>`;
    }
    html += `</div>`;
  } else {
    html += `<div class="sidebar-empty-state"><span class="ses-icon">${ICON_CHAT}</span><span>No chats yet</span><span class="ses-hint">Start a new conversation</span></div>`;
  }
  html += `</div>`;

  content.innerHTML = html;
  wireListEvents();
  if (selectionMode) updateSelectionUI();
}

/* ───────────────────── LIST EVENTS ───────────────────── */
function wireListEvents(): void {
  const content = document.querySelector('.sidebar-content') as HTMLElement | null;
  if (!content) return;
  content.addEventListener('click', (e) => e.stopPropagation());

  if (selectionMode) {
    document.getElementById('bulkCancelBtn')?.addEventListener('click', (e) => { e.stopPropagation(); exitSelectionMode(); });
    document.getElementById('bulkDeleteBtn')?.addEventListener('click', (e) => { e.stopPropagation(); showDeleteConfirmation(); });
    document.getElementById('bulkDotsBtn')?.addEventListener('click', (e) => {
      e.stopImmediatePropagation(); e.preventDefault();
      const anchor = e.currentTarget as HTMLElement | null;
      if (!anchor) return;
      if (bulkMenuEl) { closeBulkMenu(); return; }
      openBulkMenu(anchor);
    });
    content.querySelectorAll('.chat-item').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (node as HTMLElement).dataset.id;
        if (id) toggleSelect(id);
      });
    });
    return;
  }

  content.querySelectorAll('.chat-item').forEach(node => {
    const el = node as HTMLElement;
    const id = el.dataset.id;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = e.target as HTMLElement | null;
      if (t && t.closest('.chat-item-menu')) return;
      if (!id) return;
      closeMenu();
      setActiveWorkspaceFilter(null);
      loadSession(id);
      if (isMobile()) closeSidebar();
    });

    el.addEventListener('dblclick', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!id) return;
      enterSelectionMode(); selectedIds.add(id); updateSelectionUI();
    });

    const startPress = (): void => {
      if (!id) return;
      clearLongPress();
      longPressTimer = setTimeout(() => {
        enterSelectionMode(); selectedIds.add(id); updateSelectionUI();
      }, 520);
    };
    el.addEventListener('mousedown', startPress);
    el.addEventListener('mouseup', clearLongPress);
    el.addEventListener('mouseleave', clearLongPress);
    el.addEventListener('touchstart', startPress, { passive: true });
    el.addEventListener('touchmove', clearLongPress, { passive: true });
    el.addEventListener('touchend', clearLongPress, { passive: true });
    el.addEventListener('touchcancel', clearLongPress, { passive: true });
  });

  content.querySelectorAll('.chat-item-menu').forEach(node => {
    node.addEventListener('click', (e) => {
      e.stopImmediatePropagation(); e.preventDefault();
      clearLongPress();
      const anchor = node as HTMLElement;
      const rowEl = anchor.closest('.chat-item') as HTMLElement | null;
      const id = rowEl?.dataset.id;
      if (!id) return;
      const title = rowEl?.querySelector('.chat-item-title')?.textContent ?? '';
      if (menuEl && menuAnchor === anchor) { closeMenu(); return; }
      openChatMenu(anchor, id, title);
    });
  });
}

/* ───────────────────── ROW MENU (expanded list) ───────────────────── */
function openChatMenu(anchor: HTMLElement, sessionId: string, currentTitle: string): void {
  closeMenu(); closeBulkMenu();
  const sb = sidebarEl;
  if (!sb) return;

  menuAnchor = anchor;
  anchor.closest('.chat-item')?.classList.add('menu-open');

  const pop = document.createElement('div');
  pop.className = 'chat-menu';
  pop.setAttribute('role', 'menu');
  pop.innerHTML = `<button class="chat-menu-btn rename-btn" type="button" role="menuitem">${ICON_RENAME}<span>Rename</span></button><button class="chat-menu-btn delete-btn" type="button" role="menuitem">${ICON_DELETE}<span>Delete</span></button>`;
  sb.appendChild(pop);
  menuEl = pop;
  positionMenu();

  pop.addEventListener('click', (e) => e.stopPropagation());
  pop.addEventListener('mousedown', (e) => e.stopPropagation());
  pop.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

  pop.querySelector('.rename-btn')?.addEventListener('click', (e) => {
    e.stopPropagation(); showChatRename(pop, sessionId, currentTitle);
  });
  pop.querySelector('.delete-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    getAllTabs().filter(t => t.sessionId === sessionId).forEach(tab => closeTab(tab.id));
    deleteSession(sessionId);
    closeMenu();
    renderAll();
    renderRailChats();
    if (!getCurrentSession()) document.dispatchEvent(new Event('asuum:welcome-mode'));
  });
}

function positionMenu(): void {
  const pop = menuEl, anchor = menuAnchor, sb = sidebarEl;
  if (!pop || !anchor || !sb) return;
  if (!document.body.contains(anchor)) { closeMenu(); return; }

  const host = sb.getBoundingClientRect();
  const r = anchor.getBoundingClientRect();
  const mw = pop.offsetWidth || 158;
  const mh = pop.offsetHeight || 80;
  const pad = 8, gap = 4;

  const left = Math.max(pad, Math.min(r.right - host.left - mw, host.width - mw - pad));
  let top = r.top - host.top - mh - gap;
  if (top < pad) top = r.bottom - host.top + gap;
  top = Math.max(pad, Math.min(top, host.height - mh - pad));

  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}
function scheduleReposition(): void {
  if ((!menuEl && !railMenuEl) || repositionRaf !== null) return;
  repositionRaf = requestAnimationFrame(() => {
    repositionRaf = null;
    if (menuEl && menuAnchor) positionMenu();
    if (railMenuEl && railMenuAnchor) positionRailItemMenu();
  });
}

function showChatRename(menu: HTMLElement, sessionId: string, currentTitle: string): void {
  menu.innerHTML = `<div class="chat-menu-rename"><input class="chat-menu-input" type="text" value="${esc(currentTitle)}" maxlength="42" aria-label="Chat name"/><div class="chat-menu-rename-actions"><button class="rename-save" type="button" title="Save">${ICON_SAVE}</button><button class="rename-cancel" type="button" title="Cancel">${ICON_CANCEL}</button></div></div>`;
  positionMenu();
  const input = menu.querySelector('.chat-menu-input') as HTMLInputElement | null;
  if (!input) return;
  input.focus(); input.select();

  const save = (): void => {
    const v = input.value.trim();
    if (v) renameSession(sessionId, v);
    closeMenu(); renderAll(); renderRailChats();
  };
  menu.querySelector('.rename-save')?.addEventListener('click', (e) => { e.stopPropagation(); save(); });
  menu.querySelector('.rename-cancel')?.addEventListener('click', (e) => { e.stopPropagation(); closeMenu(); });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
  });
  input.addEventListener('click', (e) => e.stopPropagation());
}

function closeMenu(): void {
  menuAnchor?.closest('.chat-item')?.classList.remove('menu-open');
  menuEl?.remove();
  menuEl = null;
  menuAnchor = null;
}