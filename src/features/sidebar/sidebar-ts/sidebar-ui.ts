/**
 * sidebar-ui.ts — ASUUM SIDEBAR · PRO v3 (strict-TS safe)
 *
 *  1. Toggle always works (capture-phase, delegated, de-duped, keyboard).
 *  2. Clicks inside the drawer never close the drawer.
 *  3. Drawer closes only via toggle / outside press / Escape.
 *  4. Row menu opens ABOVE its own three-dots, inside drawer bounds.
 *  5. Any press outside an open popup dismisses it (capture phase).
 *  6. Drag-to-open follows the finger; a plain tap changes nothing.
 *  7. Outside scrim is fully transparent — zero shadow, zero tint.
 */
import { getAllSessions, onHistoryChange, loadSession, startNewChat, getCurrentSession, renameSession, deleteSession } from '../../chat-screen/services/chat-store';
import type { ChatSession } from '../../chat-screen/services/chat-store';
import { getAllTabs, closeTab, setActiveWorkspaceFilter, onTabsChange } from '../../header/services/header-tabs-store';
import { setExplicitNewTabClicked, clearInjectedColor } from '../../welcome-screen/welcome-ts/welcome-ui';

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
let booted = false;

const SIDEBAR_THEME_KEY = 'asuum_sidebar_theme';
const MOBILE_BP = 768;
const NARROW_BP = 380;
const OPEN_RATIO = 0.35;
const FLICK_VELOCITY = 0.45;
const DRAG_START_PX = 10;
const VERTICAL_CANCEL_PX = 14;

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
function fallbackWidth(): number {
  if (window.innerWidth <= NARROW_BP) return 264;
  if (isMobile()) return 288;
  return 260;
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
/** Safe TouchList read — strict-TS proof. */
function touchPoint(list: TouchList, i: number): { x: number; y: number } | null {
  const t = list.item(i);
  if (!t) return null;
  return { x: t.clientX, y: t.clientY };
}

/* ───────────────────────── THEME ───────────────────────── */
function getStoredTheme(): 'dark' | 'light' | null {
  try { return localStorage.getItem(SIDEBAR_THEME_KEY) as 'dark' | 'light' | null; } catch { return null; }
}
function applyTheme(theme: 'dark' | 'light'): void {
  document.body.classList.toggle('sidebar-light', theme === 'light');
}
function toggleSidebarTheme(): void {
  const next = document.body.classList.contains('sidebar-light') ? 'dark' : 'light';
  applyTheme(next);
  try { localStorage.setItem(SIDEBAR_THEME_KEY, next); } catch { /* storage blocked */ }
}

/* ─────────── INVISIBLE HIT-AREA · no shadow, no tint, no blur ─────────── */
function ensureScrim(): HTMLElement {
  if (scrimEl) return scrimEl;
  const el = document.createElement('div');
  el.className = 'sidebar-mobile-overlay';
  el.setAttribute('aria-hidden', 'true');
  el.addEventListener('click', (e) => { e.stopPropagation(); closeSidebar(); });
  document.body.appendChild(el);
  scrimEl = el;
  return el;
}
function syncScrimPosition(): void {
  const el = scrimEl;
  if (el) el.style.left = `${drawerWidth()}px`;
}
function showScrim(): void {
  const el = ensureScrim();
  syncScrimPosition();
  el.style.display = 'block';
  el.style.opacity = '1';
  el.style.pointerEvents = '';
  requestAnimationFrame(() => { el.classList.add('visible'); });
}
function hideScrim(): void {
  const el = scrimEl;
  if (!el) return;
  el.classList.remove('visible');
  el.style.pointerEvents = 'none';
  setTimeout(() => { if (!el.classList.contains('visible')) el.style.display = 'none'; }, 220);
}

/* ───────────────────────── OPEN / CLOSE ───────────────────────── */
function openSidebar(): void {
  const sb = sidebarEl;
  if (!sb) return;
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
  if (selectionMode) { selectionMode = false; selectedIds.clear(); renderAll(); }
  sb.style.transition = '';
  sb.style.transform = '';
  sb.classList.remove('dragging', 'expanded');
  syncToggleAria();
  hideScrim();
}
function toggleSidebar(): void {
  const now = Date.now();
  if (now - lastToggleAt < 200) return;
  lastToggleAt = now;
  if (isOpen()) closeSidebar(); else openSidebar();
}
function syncToggleAria(): void {
  const btn = document.getElementById('sidebarToggle');
  if (!btn) return;
  const open = isOpen();
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Collapse sidebar' : 'Expand sidebar');
  btn.title = open ? 'Collapse sidebar' : 'Expand sidebar';
}

/* ───────────────── GESTURES · finger-tracked drawer ───────────────── */
function setupGestures(): void {
  let tracking = false;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let baseTranslate = 0;
  let width = 288;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;

  const skip = '.chat-input,.input-container,.message-bubble,.chat-scrollbar,.chat-scrollbar-hover-zone,.timeline-system,.mm-wrap,.cr-overlay,.mh-overlay,.sb-toggle-btn';

  document.addEventListener('touchstart', (e: TouchEvent) => {
    const sb = sidebarEl;
    if (!isMobile() || !sb || e.touches.length !== 1) return;
    const pt = touchPoint(e.touches, 0);
    if (!pt) return;
    const t = e.target as HTMLElement | null;
    if (!t || t.closest(skip)) return;
    const open = isOpen();
    if (open && !sb.contains(t)) return;

    tracking = true;
    dragging = false;
    startX = pt.x; lastX = pt.x;
    startY = pt.y;
    lastT = performance.now();
    velocity = 0;
    width = drawerWidth();
    baseTranslate = open ? 0 : -width;
  }, { passive: true });

  document.addEventListener('touchmove', (e: TouchEvent) => {
    const sb = sidebarEl;
    if (!tracking || !sb) return;
    const pt = touchPoint(e.touches, 0);
    if (!pt) return;

    const dx = pt.x - startX;
    const dy = Math.abs(pt.y - startY);

    if (!dragging) {
      if (dy > VERTICAL_CANCEL_PX && dy > Math.abs(dx)) { tracking = false; return; }
      if (Math.abs(dx) < DRAG_START_PX) return;
      if (Math.abs(dx) <= dy) { tracking = false; return; }
      dragging = true;
      closeMenu();
      closeBulkMenu();
      sb.classList.add('dragging');
      const el = ensureScrim();
      syncScrimPosition();
      el.style.display = 'block';
      el.classList.remove('visible');
      el.style.pointerEvents = 'none';
    }

    const now = performance.now();
    if (now > lastT) velocity = (pt.x - lastX) / (now - lastT);
    lastX = pt.x;
    lastT = now;

    const translate = Math.max(-width, Math.min(0, baseTranslate + dx));
    sb.style.transform = `translateX(${translate}px)`;
    /* scrim stays fully invisible — no opacity / tint writes */
  }, { passive: true });

  const finish = (): void => {
    if (!tracking) return;
    const wasDragging = dragging;
    tracking = false;
    dragging = false;

    const sb = sidebarEl;
    if (!sb || !wasDragging) return;   // plain tap → nothing changes

    suppressUntil = Date.now() + 320;
    sb.classList.remove('dragging');
    sb.style.transition = '';
    sb.style.transform = '';

    const raw = getComputedStyle(sb).transform;
    const parts = raw.match(/-?\d+\.?\d*/g);
    const txRaw = parts && parts.length >= 6 ? parts[4] : undefined;
    const tx = txRaw !== undefined ? Number.parseFloat(txRaw) : NaN;
    const current = Number.isFinite(tx) ? tx : (isOpen() ? 0 : -width);
    const progress = Math.max(0, Math.min(1, (current + width) / width));

    let shouldOpen: boolean;
    if (velocity > FLICK_VELOCITY) shouldOpen = true;
    else if (velocity < -FLICK_VELOCITY) shouldOpen = false;
    else shouldOpen = progress >= OPEN_RATIO;

    if (shouldOpen) openSidebar(); else closeSidebar();
  };

  document.addEventListener('touchend', finish, { passive: true });
  document.addEventListener('touchcancel', finish, { passive: true });
}

/* ───────────────────────── INIT ───────────────────────── */
export function initializeSidebarUI(): void {
  if (booted) return;
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  booted = true;
  sidebarEl = sb;
  console.log('📋 Sidebar UI (Pro v3 — comfortable desktop · touch-first mobile)');

  applyTheme(getStoredTheme() || 'dark');

  document.getElementById('sidebarOverlay')?.remove();
  document.querySelector('.sidebar-overlay')?.remove();
  document.getElementById('sidebarCloseBtn')?.remove();
  document.querySelector('.sidebar-close-btn')?.remove();

  ensureScrim();
  setupGestures();
  syncToggleAria();

  /* Toggle — capture + delegated + keyboard */
  const toggleHandler = (e: Event): void => {
    const t = e.target as HTMLElement | null;
    if (!t || !t.closest('#sidebarToggle,.sb-toggle-btn')) return;
    e.stopPropagation();
    e.preventDefault();
    toggleSidebar();
  };
  document.addEventListener('pointerup', toggleHandler, true);
  document.addEventListener('click', toggleHandler, true);
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (!t || !t.closest('#sidebarToggle,.sb-toggle-btn')) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleSidebar(); }
  }, true);

  /* Press-anywhere dismiss — capture phase beats every stopPropagation */
  const dismissOnPress = (e: Event): void => {
    if (Date.now() < suppressUntil) return;
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const openMenuEl = menuEl;
    const openBulkEl = bulkMenuEl;
    if (openMenuEl && !openMenuEl.contains(t) && !t.closest('.chat-item-menu')) closeMenu();
    if (openBulkEl && !openBulkEl.contains(t) && !t.closest('.bb-dots')) closeBulkMenu();
  };
  document.addEventListener('pointerdown', dismissOnPress, true);
  document.addEventListener('touchstart', dismissOnPress, { capture: true, passive: true });

  const guard = (e: Event): void => { e.stopPropagation(); };
  sb.addEventListener('mousedown', guard);
  sb.addEventListener('touchstart', guard, { passive: true });
  sb.addEventListener('click', guard);

  document.getElementById('sbThemeToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebarTheme();
  });
  document.querySelector('.new-chat-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handleNewChatFromSidebar();
  });

  renderAll();
  onHistoryChange(() => { if (!selectionMode) renderAll(); });
  onTabsChange(() => { if (!selectionMode) renderAll(); });

  /* Outside press — the only place that closes the DRAWER */
  document.addEventListener('click', (e: Event) => {
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
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (menuEl) { closeMenu(); return; }
    if (bulkMenuEl) { closeBulkMenu(); return; }
    if (selectionMode) { exitSelectionMode(); return; }
    if (isOpen()) closeSidebar();
  });

  const scheduleReposition = (): void => {
    if (!menuEl || !menuAnchor || repositionRaf !== null) return;
    repositionRaf = requestAnimationFrame(() => { repositionRaf = null; positionMenu(); });
  };
  document.querySelector('.chat-list-area')?.addEventListener('scroll', scheduleReposition, { passive: true });

  window.addEventListener('resize', () => {
    syncScrimPosition();
    if (!isMobile()) hideScrim();
    else if (isOpen()) showScrim();
    scheduleReposition();
  });
}

/* ───────────────────────── NEW CHAT ───────────────────────── */
function handleNewChatFromSidebar(): void {
  if (selectionMode) exitSelectionMode();
  closeSidebar();
  startNewChat();
  setExplicitNewTabClicked(false);
  clearInjectedColor();
  setActiveWorkspaceFilter(null);
  document.dispatchEvent(new Event('asuum:welcome-mode'));
  const panel = document.getElementById('mainPanel');
  if (panel) panel.classList.remove('chat-active', 'has-tabs', 'new-tab-mode');
  const inp = document.querySelector('.chat-input') as HTMLTextAreaElement | null;
  if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input')); inp.focus(); }
}

/* ───────────────────────── SELECTION MODE ───────────────────────── */
function enterSelectionMode(): void { selectionMode = true; selectedIds.clear(); closeMenu(); renderAll(); }
function exitSelectionMode(): void { selectionMode = false; selectedIds.clear(); closeBulkMenu(); renderAll(); }

function toggleSelect(id: string): void {
  if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
  updateSelectionUI();
}
function updateSelectionUI(): void {
  const content = document.querySelector('.sidebar-content');
  if (!content) return;
  content.querySelectorAll('.chat-item').forEach(item => {
    const el = item as HTMLElement;
    const id = el.dataset.id ?? '';
    const cb = el.querySelector('.select-circle') as HTMLElement | null;
    const on = selectedIds.has(id);
    if (cb) { cb.classList.toggle('checked', on); cb.innerHTML = on ? ICON_CHECK : ''; }
    el.classList.toggle('selected', on);
  });
  const countEl = document.getElementById('bulkCount');
  const deleteBtn = document.getElementById('bulkDeleteBtn') as HTMLButtonElement | null;
  const n = selectedIds.size;
  if (countEl) {
    countEl.textContent = n === 0 ? 'None' : String(n);
    countEl.setAttribute('aria-label', `${n} chat${n === 1 ? '' : 's'} selected`);
  }
  if (deleteBtn) {
    const has = n > 0;
    deleteBtn.style.opacity = has ? '1' : '0.34';
    deleteBtn.style.pointerEvents = has ? 'auto' : 'none';
    deleteBtn.disabled = !has;
  }
}
function collectIds(): string[] {
  const out: string[] = [];
  document.querySelectorAll('.chat-item').forEach(el => {
    const id = (el as HTMLElement).dataset.id;
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

/* ───────────────── BULK MENU · professional labels ───────────────── */
function openBulkMenu(anchor: HTMLElement): void {
  closeBulkMenu();
  closeMenu();
  const sb = sidebarEl;
  if (!sb) return;

  const every = allSelected();
  const pop = document.createElement('div');
  pop.className = 'bulk-dropdown';
  pop.setAttribute('role', 'menu');
  pop.innerHTML = every
    ? `<button class="bulk-dropdown-item" type="button" role="menuitem">${ICON_UNTICK}<span>Clear selection</span></button>`
    : `<button class="bulk-dropdown-item" type="button" role="menuitem">${ICON_TICK_SM}<span>Select all chats</span></button>`;
  sb.appendChild(pop);
  bulkMenuEl = pop;

  const host = sb.getBoundingClientRect();
  const r = anchor.getBoundingClientRect();
  const mw = pop.offsetWidth || 180;
  const mh = pop.offsetHeight || 42;
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
  const el = bulkMenuEl;
  if (el) el.remove();
  bulkMenuEl = null;
}

/* ───────────────────────── DELETE CONFIRM ───────────────────────── */
function showDeleteConfirmation(): void {
  const count = selectedIds.size;
  if (count === 0) return;
  closeBulkMenu();
  const overlay = document.createElement('div');
  overlay.className = 'bulk-delete-overlay';
  overlay.innerHTML = `<div class="bulk-delete-modal" role="dialog" aria-modal="true"><div class="bdm-icon-wrap">${ICON_TRASH_LG}</div><h3 class="bdm-title">Delete ${count} chat${count > 1 ? 's' : ''}?</h3><p class="bdm-desc">This permanently removes ${count === 1 ? 'this conversation' : 'these conversations'} and cannot be undone.</p><div class="bdm-actions"><button class="bdm-btn bdm-cancel" type="button">Cancel</button><button class="bdm-btn bdm-confirm" type="button">Delete ${count > 1 ? 'all' : 'chat'}</button></div></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.classList.add('visible'); });

  const dismiss = (): void => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') dismiss(); };

  overlay.addEventListener('click', (e) => { e.stopPropagation(); if (e.target === overlay) dismiss(); });
  overlay.querySelector('.bdm-cancel')?.addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
  overlay.querySelector('.bdm-confirm')?.addEventListener('click', (e) => { e.stopPropagation(); executeBulkDelete(); dismiss(); });
  document.addEventListener('keydown', onKey);
  (overlay.querySelector('.bdm-cancel') as HTMLButtonElement | null)?.focus();
}
function executeBulkDelete(): void {
  Array.from(selectedIds).forEach(id => {
    getAllTabs().filter(t => t.sessionId === id).forEach(tab => closeTab(tab.id));
    deleteSession(id);
  });
  exitSelectionMode();
  renderAll();
  if (!getCurrentSession()) document.dispatchEvent(new Event('asuum:welcome-mode'));
}

/* ───────────────────────── RENDER ───────────────────────── */
function renderAll(): void {
  const content = document.querySelector('.sidebar-content');
  if (!content) return;
  closeMenu();

  const sorted = [...getAllSessions()].sort((a, b) => b.updatedAt - a.updatedAt);
  const activeId = getCurrentSession()?.id ?? null;
  let html = '';
  if (selectionMode) {
    html += `<div class="bulk-bar-sticky"><button class="bb-cancel" id="bulkCancelBtn" type="button">Cancel</button><span class="bb-count" id="bulkCount">0</span><button class="bb-delete" id="bulkDeleteBtn" type="button" title="Delete selected">${ICON_DELETE}<span class="bb-delete-text">Delete</span></button><button class="bb-dots" id="bulkDotsBtn" type="button" title="Selection options" aria-label="Selection options">${ICON_DOTS}</button></div>`;
  } else {
    html += `<div class="bulk-bar-sticky bulk-bar-normal"><span class="section-label">All Chats</span></div>`;
  }
  html += `<div class="chat-list-area">`;
  if (sorted.length > 0) {
    for (const group of groupByDate(sorted)) {
      html += `<div class="chat-group"><div class="chat-group-label">${group.label}</div>`;
      for (const s of group.items) {
        const active = !selectionMode && s.id === activeId ? ' active' : '';
        const checked = selectionMode && selectedIds.has(s.id);
        if (selectionMode) {
          html += `<div class="chat-item${checked ? ' selected' : ''}" data-id="${esc(s.id)}" role="option" aria-selected="${checked}"><span class="select-circle${checked ? ' checked' : ''}">${checked ? ICON_CHECK : ''}</span><span class="chat-item-icon">${ICON_CHAT}</span><span class="chat-item-title">${esc(s.title)}</span></div>`;
        } else {
          html += `<div class="chat-item${active}" data-id="${esc(s.id)}"><span class="chat-item-icon">${ICON_CHAT}</span><span class="chat-item-title">${esc(s.title)}</span><button class="chat-item-menu" type="button" title="Chat options" aria-label="Chat options">${ICON_DOTS}</button></div>`;
        }
      }
      html += `</div>`;
    }
  } else {
    html += `<div class="sidebar-empty-state"><span class="ses-icon">${ICON_CHAT}</span><span>No chats yet</span><span class="ses-hint">Start a new conversation</span></div>`;
  }
  html += `</div>`;
  content.innerHTML = html;
  wireEvents();
  if (selectionMode) updateSelectionUI();
}

function groupByDate(sessions: ChatSession[]): Array<{ label: string; items: ChatSession[] }> {
  const t0 = new Date();
  t0.setHours(0, 0, 0, 0);
  const t = t0.getTime();
  const buckets: Array<{ label: string; items: ChatSession[] }> = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 Days', items: [] },
    { label: 'Previous 30 Days', items: [] },
    { label: 'Older', items: [] }
  ];
  const day = 86400000;
  for (const s of sessions) {
    if (s.updatedAt >= t) buckets[0].items.push(s);
    else if (s.updatedAt >= t - day) buckets[1].items.push(s);
    else if (s.updatedAt >= t - 7 * day) buckets[2].items.push(s);
    else if (s.updatedAt >= t - 30 * day) buckets[3].items.push(s);
    else buckets[4].items.push(s);
  }
  return buckets.filter(g => g.items.length > 0);
}

/* ───────────────────────── EVENTS ───────────────────────── */
function wireEvents(): void {
  const content = document.querySelector('.sidebar-content') as HTMLElement | null;
  if (!content) return;
  content.addEventListener('click', (e) => e.stopPropagation());

  if (selectionMode) {
    document.getElementById('bulkCancelBtn')?.addEventListener('click', (e) => { e.stopPropagation(); exitSelectionMode(); });
    document.getElementById('bulkDeleteBtn')?.addEventListener('click', (e) => { e.stopPropagation(); showDeleteConfirmation(); });
    document.getElementById('bulkDotsBtn')?.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      const anchor = e.currentTarget as HTMLElement | null;
      if (!anchor) return;
      if (bulkMenuEl) { closeBulkMenu(); return; }
      openBulkMenu(anchor);
    });
    content.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (item as HTMLElement).dataset.id;
        if (id) toggleSelect(id);
      });
    });
    return;
  }

  content.querySelectorAll('.chat-item').forEach(item => {
    const el = item as HTMLElement;
    const id = el.dataset.id;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = e.target as HTMLElement | null;
      if (t && t.closest('.chat-item-menu')) return;
      if (!id) return;
      closeMenu();
      setActiveWorkspaceFilter(null);
      loadSession(id);
    });

    el.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!id) return;
      enterSelectionMode();
      selectedIds.add(id);
      updateSelectionUI();
    });

    const startPress = (): void => {
      if (!id) return;
      clearLongPress();
      longPressTimer = setTimeout(() => {
        enterSelectionMode();
        selectedIds.add(id);
        updateSelectionUI();
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

  content.querySelectorAll('.chat-item-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      clearLongPress();
      const anchor = btn as HTMLElement;
      const row = anchor.closest('.chat-item') as HTMLElement | null;
      const id = row?.dataset.id;
      if (!id) return;
      const title = row?.querySelector('.chat-item-title')?.textContent ?? '';
      if (menuEl && menuAnchor === anchor) { closeMenu(); return; }
      openChatMenu(anchor, id, title);
    });
  });
}

/* ─────────── ROW MENU · above its own dots ─────────── */
function openChatMenu(anchor: HTMLElement, sessionId: string, currentTitle: string): void {
  closeMenu();
  closeBulkMenu();
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
    e.stopPropagation();
    showChatRename(pop, sessionId, currentTitle);
  });
  pop.querySelector('.delete-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    getAllTabs().filter(t => t.sessionId === sessionId).forEach(tab => closeTab(tab.id));
    deleteSession(sessionId);
    closeMenu();
    renderAll();
    if (!getCurrentSession()) document.dispatchEvent(new Event('asuum:welcome-mode'));
  });
}

function positionMenu(): void {
  const pop = menuEl;
  const anchor = menuAnchor;
  const sb = sidebarEl;
  if (!pop || !anchor || !sb) return;
  if (!document.body.contains(anchor)) { closeMenu(); return; }

  const host = sb.getBoundingClientRect();
  const r = anchor.getBoundingClientRect();
  const mw = pop.offsetWidth || 170;
  const mh = pop.offsetHeight || 84;
  const pad = 8;
  const gap = 4;

  let left = r.right - host.left - mw;
  left = Math.max(pad, Math.min(left, host.width - mw - pad));

  let top = r.top - host.top - mh - gap;
  if (top < pad) top = r.bottom - host.top + gap;
  top = Math.max(pad, Math.min(top, host.height - mh - pad));

  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

function showChatRename(menu: HTMLElement, sessionId: string, currentTitle: string): void {
  menu.innerHTML = `<div class="chat-menu-rename"><input class="chat-menu-input" type="text" value="${esc(currentTitle)}" maxlength="42" aria-label="Chat name"/><div class="chat-menu-rename-actions"><button class="rename-save" type="button" title="Save">${ICON_SAVE}</button><button class="rename-cancel" type="button" title="Cancel">${ICON_CANCEL}</button></div></div>`;
  positionMenu();
  const input = menu.querySelector('.chat-menu-input') as HTMLInputElement | null;
  if (!input) return;
  input.focus();
  input.select();
  const save = (): void => {
    const v = input.value.trim();
    if (v) renameSession(sessionId, v);
    closeMenu();
    renderAll();
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
  const anchor = menuAnchor;
  if (anchor) anchor.closest('.chat-item')?.classList.remove('menu-open');
  const pop = menuEl;
  if (pop) pop.remove();
  menuEl = null;
  menuAnchor = null;
}