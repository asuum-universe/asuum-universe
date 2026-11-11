/**
 * sidebar-ui.ts — ASUUM SIDEBAR · PRO MINIMAL
 *
 * GUARANTEES
 *  1. Toggle button ALWAYS opens/closes (capture-phase, delegated, de-duped).
 *  2. Clicks inside the drawer NEVER close the drawer.
 *  3. Drawer closes only via: toggle, outside content, Escape.
 *  4. Row menu opens ABOVE its own three-dots, inside drawer bounds.
 *  5. Row menu / bulk menu close on ANY press outside them — sidebar empty space,
 *     another row, chat screen, welcome screen, anywhere.
 *  6. Swipe reacts to real horizontal drags only; a plain tap changes nothing.
 */
import { getAllSessions, onHistoryChange, loadSession, startNewChat, getCurrentSession, renameSession, deleteSession, ChatSession } from '../../chat-screen/services/chat-store';
import { getAllTabs, closeTab, setActiveWorkspaceFilter, onTabsChange } from '../../header/services/header-tabs-store';
import { setExplicitNewTabClicked, clearInjectedColor } from '../../welcome-screen/welcome-ts/welcome-ui';

/* ───────────────────────── STATE ───────────────────────── */
let sidebarEl: HTMLElement | null = null;
let overlayEl: HTMLElement | null = null;
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
const OPEN_RATIO = 0.35;
const FLICK_VELOCITY = 0.45;
const DRAG_START_PX = 10;
const VERTICAL_CANCEL_PX = 14;

/* ───────────────────────── ICONS ───────────────────────── */
const ICON_DOTS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>`;
const ICON_RENAME = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
const ICON_DELETE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const ICON_SAVE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_CANCEL = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const ICON_CHECK = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_TRASH_LG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

/* ───────────────────────── HELPERS ───────────────────────── */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function isMobile(): boolean { return window.innerWidth <= MOBILE_BP; }
function isOpen(): boolean { return !!sidebarEl && sidebarEl.classList.contains('expanded'); }
function drawerWidth(): number {
  if (!sidebarEl) return isMobile() ? 276 : 232;
  return Math.round(sidebarEl.getBoundingClientRect().width) || (isMobile() ? 276 : 232);
}
function clearLongPress(): void { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } }

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
  try { localStorage.setItem(SIDEBAR_THEME_KEY, next); } catch {}
}

/* ───────────────────────── OUTSIDE SCRIM ───────────────────────── */
function ensureOverlay(): void {
  if (overlayEl) return;
  overlayEl = document.createElement('div');
  overlayEl.className = 'sidebar-mobile-overlay';
  overlayEl.setAttribute('aria-hidden', 'true');
  overlayEl.addEventListener('click', (e) => { e.stopPropagation(); closeSidebar(); });
  document.body.appendChild(overlayEl);
}
function syncOverlayPosition(): void {
  if (overlayEl) overlayEl.style.left = `${drawerWidth()}px`;
}
function showOverlay(): void {
  ensureOverlay();
  syncOverlayPosition();
  overlayEl!.style.display = 'block';
  overlayEl!.style.opacity = '';
  overlayEl!.style.pointerEvents = '';
  requestAnimationFrame(() => overlayEl?.classList.add('visible'));
}
function hideOverlay(): void {
  if (!overlayEl) return;
  const el = overlayEl;
  el.classList.remove('visible');
  el.style.pointerEvents = 'none';
  setTimeout(() => {
    if (!el.classList.contains('visible')) { el.style.display = 'none'; el.style.opacity = ''; }
  }, 240);
}

/* ───────────────────────── OPEN / CLOSE ───────────────────────── */
function openSidebar(): void {
  if (!sidebarEl) return;
  sidebarEl.style.transition = '';
  sidebarEl.style.transform = '';
  sidebarEl.classList.remove('dragging');
  sidebarEl.classList.add('expanded');
  syncToggleAria();
  if (isMobile()) showOverlay(); else hideOverlay();
}
function closeSidebar(): void {
  if (!sidebarEl) return;
  closeMenu();
  closeBulkMenu();
  if (selectionMode) { selectionMode = false; selectedIds.clear(); renderAll(); }
  sidebarEl.style.transition = '';
  sidebarEl.style.transform = '';
  sidebarEl.classList.remove('dragging', 'expanded');
  syncToggleAria();
  hideOverlay();
}
function toggleSidebar(): void {
  const now = Date.now();
  if (now - lastToggleAt < 200) return;
  lastToggleAt = now;
  isOpen() ? closeSidebar() : openSidebar();
}
function syncToggleAria(): void {
  const btn = document.getElementById('sidebarToggle');
  if (!btn) return;
  const open = isOpen();
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Collapse sidebar' : 'Expand sidebar');
  btn.title = open ? 'Collapse sidebar' : 'Expand sidebar';
}

/* ───────────────────────── GESTURES (drag only) ───────────────────────── */
function setupGestures(): void {
  let tracking = false, dragging = false;
  let startX = 0, startY = 0, baseTranslate = 0, width = 276;
  let lastX = 0, lastT = 0, velocity = 0;

  const skip = '.chat-input,.input-container,.message-bubble,.chat-scrollbar,.chat-scrollbar-hover-zone,.timeline-system,.mm-wrap,.cr-overlay,.mh-overlay,.sb-toggle-btn';

  document.addEventListener('touchstart', (e: TouchEvent) => {
    if (!isMobile() || !sidebarEl || e.touches.length !== 1) return;
    const t = e.target as HTMLElement;
    if (t.closest(skip)) return;
    const open = isOpen();
    if (open && !sidebarEl.contains(t)) return;
    tracking = true; dragging = false;
    startX = lastX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    lastT = performance.now();
    velocity = 0;
    width = drawerWidth();
    baseTranslate = open ? 0 : -width;
  }, { passive: true });

  document.addEventListener('touchmove', (e: TouchEvent) => {
    if (!tracking || !sidebarEl) return;
    const x = e.touches[0].clientX, y = e.touches[0].clientY;
    const dx = x - startX, dy = Math.abs(y - startY);

    if (!dragging) {
      if (dy > VERTICAL_CANCEL_PX && dy > Math.abs(dx)) { tracking = false; return; }
      if (Math.abs(dx) < DRAG_START_PX) return;
      if (Math.abs(dx) <= dy) { tracking = false; return; }
      dragging = true;
      closeMenu(); closeBulkMenu();
      sidebarEl.classList.add('dragging');
      ensureOverlay(); syncOverlayPosition();
      overlayEl!.style.display = 'block';
      overlayEl!.classList.remove('visible');
      overlayEl!.style.pointerEvents = 'none';
    }

    const now = performance.now();
    if (now > lastT) velocity = (x - lastX) / (now - lastT);
    lastX = x; lastT = now;

    const translate = Math.max(-width, Math.min(0, baseTranslate + dx));
    sidebarEl.style.transform = `translateX(${translate}px)`;
    if (overlayEl) overlayEl.style.opacity = String(((translate + width) / width) * 0.32);
  }, { passive: true });

  const finish = (): void => {
    if (!tracking) return;
    const wasDragging = dragging;
    tracking = false; dragging = false;
    if (!sidebarEl || !wasDragging) return;   // plain tap → no state change

    suppressUntil = Date.now() + 320;
    sidebarEl.classList.remove('dragging');
    sidebarEl.style.transition = '';
    sidebarEl.style.transform = '';

    const m = getComputedStyle(sidebarEl).transform.match(/-?\d+\.?\d*/g);
    const current = m && m.length >= 6 ? parseFloat(m[4]) : (isOpen() ? 0 : -width);
    const progress = Math.max(0, Math.min(1, (current + width) / width));
    const shouldOpen = velocity > FLICK_VELOCITY ? true
      : velocity < -FLICK_VELOCITY ? false
      : progress >= OPEN_RATIO;

    shouldOpen ? openSidebar() : closeSidebar();
  };

  document.addEventListener('touchend', finish, { passive: true });
  document.addEventListener('touchcancel', finish, { passive: true });
}

/* ───────────────────────── INIT ───────────────────────── */
export function initializeSidebarUI(): void {
  if (booted) return;
  booted = true;
  console.log('📋 Sidebar UI (Pro Minimal — tight rhythm · press-anywhere dismiss)');

  sidebarEl = document.getElementById('sidebar');
  if (!sidebarEl) { booted = false; return; }

  applyTheme(getStoredTheme() || 'dark');

  document.getElementById('sidebarOverlay')?.remove();
  document.querySelector('.sidebar-overlay')?.remove();
  document.getElementById('sidebarCloseBtn')?.remove();
  document.querySelector('.sidebar-close-btn')?.remove();

  ensureOverlay();
  setupGestures();
  syncToggleAria();

  /* ✅ TOGGLE — capture + delegated + keyboard */
  const toggleHandler = (e: Event): void => {
    const t = e.target as HTMLElement | null;
    if (!t?.closest?.('#sidebarToggle,.sb-toggle-btn')) return;
    e.stopPropagation();
    e.preventDefault();
    toggleSidebar();
  };
  document.addEventListener('pointerup', toggleHandler, true);
  document.addEventListener('click', toggleHandler, true);
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (!t?.closest?.('#sidebarToggle,.sb-toggle-btn')) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleSidebar(); }
  }, true);

  /**
   * ✅ PRESS-ANYWHERE DISMISS — capture phase.
   * Runs before every target handler, so stopPropagation inside the drawer
   * can never block it. Any press outside an open popup closes that popup:
   * sidebar empty space, another chat row, profile, chat screen, welcome screen.
   * The popup's own trigger is excluded so its toggle behaviour stays intact.
   */
  const dismissOnPress = (e: Event): void => {
    if (Date.now() < suppressUntil) return;
    const t = e.target as HTMLElement | null;
    if (!t) return;
    if (menuEl && !menuEl.contains(t) && !t.closest?.('.chat-item-menu')) closeMenu();
    if (bulkMenuEl && !bulkMenuEl.contains(t) && !t.closest?.('.bb-dots')) closeBulkMenu();
  };
  document.addEventListener('pointerdown', dismissOnPress, true);
  document.addEventListener('touchstart', dismissOnPress, { capture: true, passive: true });

  /* Everything inside the drawer stops here — cannot reach the outside handler */
  const guard = (e: Event): void => { e.stopPropagation(); };
  sidebarEl.addEventListener('mousedown', guard);
  sidebarEl.addEventListener('touchstart', guard, { passive: true });
  sidebarEl.addEventListener('click', guard);

  document.getElementById('sbThemeToggle')?.addEventListener('click', (e) => {
    e.stopPropagation(); toggleSidebarTheme();
  });
  document.querySelector('.new-chat-btn')?.addEventListener('click', (e) => {
    e.stopPropagation(); handleNewChatFromSidebar();
  });

  renderAll();
  onHistoryChange(() => { if (!selectionMode) renderAll(); });
  onTabsChange(() => { if (!selectionMode) renderAll(); });

  /* ✅ OUTSIDE CLICK — only place allowed to close the DRAWER */
  document.addEventListener('click', (e: Event) => {
    if (Date.now() < suppressUntil) return;
    const target = e.target as HTMLElement;
    if (target.closest?.('#sidebarToggle,.sb-toggle-btn')) return;
    if (sidebarEl && sidebarEl.contains(target)) return;
    if (menuEl && menuEl.contains(target)) return;
    if (bulkMenuEl && bulkMenuEl.contains(target)) return;
    if (overlayEl && overlayEl.contains(target)) return;
    if (target.closest?.('.cr-overlay,.mh-overlay,.mm-wrap')) return;
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
    syncOverlayPosition();
    if (!isMobile()) hideOverlay();
    else if (isOpen()) showOverlay();
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
    const id = (item as HTMLElement).dataset.id || '';
    const cb = item.querySelector('.select-circle') as HTMLElement | null;
    const on = selectedIds.has(id);
    if (cb) { cb.classList.toggle('checked', on); cb.innerHTML = on ? ICON_CHECK : ''; }
    item.classList.toggle('selected', on);
  });
  const countEl = document.getElementById('bulkCount');
  const deleteBtn = document.getElementById('bulkDeleteBtn');
  if (countEl) countEl.textContent = `${selectedIds.size}`;
  if (deleteBtn) {
    deleteBtn.style.opacity = selectedIds.size > 0 ? '1' : '0.32';
    deleteBtn.style.pointerEvents = selectedIds.size > 0 ? 'auto' : 'none';
  }
}
function toggleSelectAll(): void {
  const ids = Array.from(document.querySelectorAll('.chat-item')).map(el => (el as HTMLElement).dataset.id || '');
  const all = ids.length > 0 && ids.every(id => selectedIds.has(id));
  if (all) selectedIds.clear(); else ids.forEach(id => { if (id) selectedIds.add(id); });
  updateSelectionUI();
  closeBulkMenu();
}

/* ───────────────────────── BULK DROPDOWN ───────────────────────── */
function openBulkMenu(anchor: HTMLElement): void {
  closeBulkMenu(); closeMenu();
  if (!sidebarEl) return;
  bulkMenuEl = document.createElement('div');
  bulkMenuEl.className = 'bulk-dropdown';
  const items = document.querySelectorAll('.chat-item');
  const all = items.length > 0 && selectedIds.size === items.length;
  bulkMenuEl.innerHTML = `<button class="bulk-dropdown-item" type="button">${all ? 'Deselect All' : 'Select All'}</button>`;
  sidebarEl.appendChild(bulkMenuEl);

  const host = sidebarEl.getBoundingClientRect();
  const r = anchor.getBoundingClientRect();
  const mw = bulkMenuEl.offsetWidth || 130;
  const left = Math.max(7, Math.min(r.right - host.left - mw, host.width - mw - 7));
  let top = r.bottom - host.top + 3;
  if (top + 38 > host.height - 7) top = r.top - host.top - 38;
  bulkMenuEl.style.left = `${left}px`;
  bulkMenuEl.style.top = `${top}px`;
  requestAnimationFrame(() => bulkMenuEl?.classList.add('visible'));

  bulkMenuEl.addEventListener('click', (e) => e.stopPropagation());
  bulkMenuEl.querySelector('.bulk-dropdown-item')?.addEventListener('click', (e) => { e.stopPropagation(); toggleSelectAll(); });
}
function closeBulkMenu(): void { if (bulkMenuEl) { bulkMenuEl.remove(); bulkMenuEl = null; } }

/* ───────────────────────── DELETE CONFIRM ───────────────────────── */
function showDeleteConfirmation(): void {
  const count = selectedIds.size;
  if (count === 0) return;
  closeBulkMenu();
  const overlay = document.createElement('div');
  overlay.className = 'bulk-delete-overlay';
  overlay.innerHTML = `<div class="bulk-delete-modal"><div class="bdm-icon-wrap">${ICON_TRASH_LG}</div><h3 class="bdm-title">Delete ${count} Chat${count > 1 ? 's' : ''}?</h3><p class="bdm-desc">This action is permanent and cannot be undone.</p><div class="bdm-actions"><button class="bdm-btn bdm-cancel" type="button">Cancel</button><button class="bdm-btn bdm-confirm" type="button">Delete Permanently</button></div></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  const dismiss = (): void => { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200); };
  overlay.addEventListener('click', (e) => { e.stopPropagation(); if (e.target === overlay) dismiss(); });
  overlay.querySelector('.bdm-cancel')?.addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
  overlay.querySelector('.bdm-confirm')?.addEventListener('click', (e) => { e.stopPropagation(); executeBulkDelete(); dismiss(); });
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') { dismiss(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
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
  let html = '';
  if (selectionMode) {
    html += `<div class="bulk-bar-sticky"><button class="bb-cancel" id="bulkCancelBtn" type="button">Cancel</button><span class="bb-count" id="bulkCount">${selectedIds.size}</span><button class="bb-delete" id="bulkDeleteBtn" type="button" title="Delete selected">${ICON_DELETE}<span class="bb-delete-text">Delete</span></button><button class="bb-dots" id="bulkDotsBtn" type="button" title="More options">${ICON_DOTS}</button></div>`;
  } else {
    html += `<div class="bulk-bar-sticky bulk-bar-normal"><span class="section-label">All Chats</span><span class="section-count">${sorted.length}</span></div>`;
  }
  html += `<div class="chat-list-area">`;
  if (sorted.length > 0) {
    for (const group of groupByDate(sorted)) {
      html += `<div class="chat-group"><div class="chat-group-label">${group.label}</div>`;
      for (const s of group.items) {
        const active = !selectionMode && s.id === getCurrentSession()?.id ? ' active' : '';
        const checked = selectionMode && selectedIds.has(s.id);
        if (selectionMode) {
          html += `<div class="chat-item${checked ? ' selected' : ''}" data-id="${esc(s.id)}"><span class="select-circle${checked ? ' checked' : ''}">${checked ? ICON_CHECK : ''}</span><span class="chat-item-icon">${ICON_CHAT}</span><span class="chat-item-title">${esc(s.title)}</span></div>`;
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
  const t0 = new Date(); t0.setHours(0, 0, 0, 0); const t = t0.getTime();
  const buckets = [
    { label: 'Today', items: [] as ChatSession[] },
    { label: 'Yesterday', items: [] as ChatSession[] },
    { label: 'Previous 7 Days', items: [] as ChatSession[] },
    { label: 'Previous 30 Days', items: [] as ChatSession[] },
    { label: 'Older', items: [] as ChatSession[] }
  ];
  for (const s of sessions) {
    if (s.updatedAt >= t) buckets[0].items.push(s);
    else if (s.updatedAt >= t - 86400000) buckets[1].items.push(s);
    else if (s.updatedAt >= t - 7 * 86400000) buckets[2].items.push(s);
    else if (s.updatedAt >= t - 30 * 86400000) buckets[3].items.push(s);
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
    document.getElementById('bulkDotsBtn')?.addEventListener('click', (e) => { e.stopPropagation(); openBulkMenu(e.currentTarget as HTMLElement); });
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
      if ((e.target as HTMLElement).closest('.chat-item-menu')) return;
      if (!id) return;
      closeMenu();
      setActiveWorkspaceFilter(null);
      loadSession(id);
    });

    el.addEventListener('dblclick', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!id) return;
      enterSelectionMode(); selectedIds.add(id); updateSelectionUI();
    });

    el.addEventListener('mousedown', () => {
      if (!id) return;
      clearLongPress();
      longPressTimer = setTimeout(() => { enterSelectionMode(); selectedIds.add(id); updateSelectionUI(); }, 520);
    });
    el.addEventListener('mouseup', clearLongPress);
    el.addEventListener('mouseleave', clearLongPress);
    el.addEventListener('touchstart', () => {
      if (!id) return;
      clearLongPress();
      longPressTimer = setTimeout(() => { enterSelectionMode(); selectedIds.add(id); updateSelectionUI(); }, 520);
    }, { passive: true });
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
      const title = row?.querySelector('.chat-item-title')?.textContent || '';
      if (!id) return;
      if (menuEl && menuAnchor === anchor) { closeMenu(); return; }
      openChatMenu(anchor, id, title);
    });
  });
}

/* ─────────── ROW MENU · always ABOVE its dots ─────────── */
function openChatMenu(anchor: HTMLElement, sessionId: string, currentTitle: string): void {
  closeMenu(); closeBulkMenu();
  if (!sidebarEl) return;

  menuAnchor = anchor;
  anchor.closest('.chat-item')?.classList.add('menu-open');

  menuEl = document.createElement('div');
  menuEl.className = 'chat-menu';
  menuEl.innerHTML = `<button class="chat-menu-btn rename-btn" type="button">${ICON_RENAME}<span>Rename</span></button><button class="chat-menu-btn delete-btn" type="button">${ICON_DELETE}<span>Delete</span></button>`;
  sidebarEl.appendChild(menuEl);
  positionMenu();

  menuEl.addEventListener('click', (e) => e.stopPropagation());
  menuEl.addEventListener('mousedown', (e) => e.stopPropagation());
  menuEl.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

  menuEl.querySelector('.rename-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menuEl) showChatRename(menuEl, sessionId, currentTitle);
  });
  menuEl.querySelector('.delete-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    getAllTabs().filter(t => t.sessionId === sessionId).forEach(tab => closeTab(tab.id));
    deleteSession(sessionId);
    closeMenu();
    renderAll();
    if (!getCurrentSession()) document.dispatchEvent(new Event('asuum:welcome-mode'));
  });
}

function positionMenu(): void {
  if (!menuEl || !menuAnchor || !sidebarEl) return;
  if (!document.body.contains(menuAnchor)) { closeMenu(); return; }

  const host = sidebarEl.getBoundingClientRect();
  const r = menuAnchor.getBoundingClientRect();
  const mw = menuEl.offsetWidth || 148;
  const mh = menuEl.offsetHeight || 72;
  const pad = 7, gap = 3;

  let left = r.right - host.left - mw;
  left = Math.max(pad, Math.min(left, host.width - mw - pad));

  let top = r.top - host.top - mh - gap;          // ABOVE the dots
  if (top < pad) top = r.bottom - host.top + gap; // fallback only if no room
  top = Math.max(pad, Math.min(top, host.height - mh - pad));

  menuEl.style.left = `${left}px`;
  menuEl.style.top = `${top}px`;
}

function showChatRename(menu: HTMLElement, sessionId: string, currentTitle: string): void {
  menu.innerHTML = `<div class="chat-menu-rename"><input class="chat-menu-input" type="text" value="${esc(currentTitle)}" maxlength="42" aria-label="Chat name"/><div class="chat-menu-rename-actions"><button class="rename-save" type="button" title="Save">${ICON_SAVE}</button><button class="rename-cancel" type="button" title="Cancel">${ICON_CANCEL}</button></div></div>`;
  positionMenu();
  const input = menu.querySelector('.chat-menu-input') as HTMLInputElement;
  input.focus(); input.select();
  const save = (): void => { const v = input.value.trim(); if (v) renameSession(sessionId, v); closeMenu(); renderAll(); };
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
  if (menuAnchor) menuAnchor.closest('.chat-item')?.classList.remove('menu-open');
  if (menuEl) menuEl.remove();
  menuEl = null;
  menuAnchor = null;
}