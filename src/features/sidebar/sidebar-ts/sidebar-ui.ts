/** sidebar-ui.ts — V1 CLEAN + STICKY BULK SELECT + SIDEBAR THEME TOGGLE + MOBILE SLIDE DRAWER */
import { getAllSessions, onHistoryChange, loadSession, startNewChat, getCurrentSession, renameSession, deleteSession, ChatSession } from '../../chat-screen/services/chat-store';
import { getAllTabs, closeTab, getActiveTab, setActiveWorkspaceFilter, onTabsChange } from '../../header/services/header-tabs-store';
import { setExplicitNewTabClicked, clearInjectedColor } from '../../welcome-screen/welcome-ts/welcome-ui';

let menuEl: HTMLElement | null = null;
let selectionMode = false;
const selectedIds = new Set<string>();
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let bulkMenuEl: HTMLElement | null = null;
let mobileOverlayEl: HTMLElement | null = null;

const SIDEBAR_THEME_KEY = 'asuum_sidebar_theme';

const ICON_DOTS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>`;
const ICON_RENAME = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
const ICON_DELETE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const ICON_SAVE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_CANCEL = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const ICON_CHECK = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_TRASH_LG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

function getStoredSidebarTheme(): 'dark' | 'light' | null {
  try { return localStorage.getItem(SIDEBAR_THEME_KEY) as 'dark' | 'light' | null; } catch { return null; }
}

function applySidebarTheme(theme: 'dark' | 'light'): void {
  if (theme === 'light') document.body.classList.add('sidebar-light');
  else document.body.classList.remove('sidebar-light');
}

function initSidebarTheme(): void {
  const stored = getStoredSidebarTheme();
  applySidebarTheme(stored || 'dark');
}

function toggleSidebarTheme(): void {
  const isLight = document.body.classList.contains('sidebar-light');
  const newTheme = isLight ? 'dark' : 'light';
  applySidebarTheme(newTheme);
  try { localStorage.setItem(SIDEBAR_THEME_KEY, newTheme); } catch {}
}

function isMobile(): boolean { return window.innerWidth <= 768; }

function ensureMobileOverlay(): void {
  if (mobileOverlayEl) return;
  mobileOverlayEl = document.createElement('div');
  mobileOverlayEl.className = 'sidebar-mobile-overlay';
  mobileOverlayEl.addEventListener('click', () => closeMobileSidebar());
  document.body.appendChild(mobileOverlayEl);
}

function showMobileOverlay(): void {
  ensureMobileOverlay();
  requestAnimationFrame(() => mobileOverlayEl?.classList.add('visible'));
}

function hideMobileOverlay(): void {
  mobileOverlayEl?.classList.remove('visible');
}

function closeMobileSidebar(): void {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('expanded');
  hideMobileOverlay();
}

/**
 * ✅ TOUCH SWIPE — Right swipe from ANYWHERE on screen opens sidebar
 * Skips interactive elements (input, bubbles, scrollbar) to avoid conflicts
 */
function setupTouchSwipe(): void {
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;
  const SWIPE_MIN = 50;
  const VERTICAL_MAX = 80;

  document.addEventListener('touchstart', (e: TouchEvent) => {
    const tgt = e.target as HTMLElement;
    if (tgt.closest('.chat-input') || tgt.closest('.message-bubble') || tgt.closest('.chat-scrollbar') || tgt.closest('.chat-scrollbar-hover-zone')) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e: TouchEvent) => {
    if (!isSwiping) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dy > VERTICAL_MAX && dy > dx) { isSwiping = false; }
  }, { passive: true });

  document.addEventListener('touchend', (e: TouchEvent) => {
    if (!isSwiping) return;
    isSwiping = false;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    if (dx > SWIPE_MIN && dx > dy && isMobile()) {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && !sidebar.classList.contains('expanded')) {
        sidebar.classList.add('expanded');
        showMobileOverlay();
      }
    }
  }, { passive: true });
}

export function initializeSidebarUI(): void {
  console.log('📋 Sidebar UI (V1 + Sticky Bulk Select + Theme Toggle + Mobile Drawer)');

  initSidebarTheme();
  setupTouchSwipe();

  const sbThemeToggle = document.getElementById('sbThemeToggle');
  if (sbThemeToggle) {
    sbThemeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebarTheme();
    });
  }

  const newChatBtn = document.querySelector('.new-chat-btn');
  if (newChatBtn) newChatBtn.addEventListener('click', () => handleNewChatFromSidebar());

  document.addEventListener('asuum:session-opened', () => {
    if (isMobile()) closeMobileSidebar();
  });

  renderAll();
  onHistoryChange(() => { if (!selectionMode) renderAll(); });
  onTabsChange(() => { if (!selectionMode) renderAll(); });
  document.addEventListener('click', (e: Event) => {
    if (bulkMenuEl && !bulkMenuEl.contains(e.target as Node)) closeBulkMenu();
    if (menuEl && !menuEl.contains(e.target as Node)) closeMenu();
  });
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (selectionMode) exitSelectionMode();
      else closeMenu();
      if (isMobile()) closeMobileSidebar();
    }
  });
}

function handleNewChatFromSidebar(): void {
  if (selectionMode) exitSelectionMode();
  if (isMobile()) closeMobileSidebar();
  startNewChat();
  setExplicitNewTabClicked(false);
  clearInjectedColor();
  setActiveWorkspaceFilter(null);
  document.dispatchEvent(new Event('asuum:welcome-mode'));
  const panel = document.getElementById('mainPanel');
  if (panel) { panel.classList.remove('chat-active'); panel.classList.remove('has-tabs'); panel.classList.remove('new-tab-mode'); }
  const inp = document.querySelector('.chat-input') as HTMLTextAreaElement | null;
  if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input')); inp.focus(); }
}

function enterSelectionMode(): void { selectionMode = true; selectedIds.clear(); renderAll(); }
function exitSelectionMode(): void { selectionMode = false; selectedIds.clear(); closeBulkMenu(); renderAll(); }

function toggleSelect(id: string): void {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  updateSelectionUI();
}

function updateSelectionUI(): void {
  const content = document.querySelector('.sidebar-content');
  if (!content) return;
  content.querySelectorAll('.chat-item').forEach(item => {
    const id = (item as HTMLElement).dataset.id || '';
    const cb = item.querySelector('.select-circle') as HTMLElement;
    if (cb) {
      if (selectedIds.has(id)) { cb.classList.add('checked'); cb.innerHTML = ICON_CHECK; }
      else { cb.classList.remove('checked'); cb.innerHTML = ''; }
    }
    item.classList.toggle('selected', selectedIds.has(id));
  });
  const countEl = document.getElementById('bulkCount');
  const deleteBtn = document.getElementById('bulkDeleteBtn');
  if (countEl) countEl.textContent = `${selectedIds.size}`;
  if (deleteBtn) {
    deleteBtn.style.opacity = selectedIds.size > 0 ? '1' : '0.3';
    deleteBtn.style.pointerEvents = selectedIds.size > 0 ? 'auto' : 'none';
  }
}

function toggleSelectAll(): void {
  const content = document.querySelector('.sidebar-content');
  if (!content) return;
  const allIds = Array.from(content.querySelectorAll('.chat-item')).map(el => (el as HTMLElement).dataset.id || '');
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  if (allSelected) selectedIds.clear();
  else allIds.forEach(id => { if (id) selectedIds.add(id); });
  updateSelectionUI();
  closeBulkMenu();
}

function openBulkMenu(anchor: HTMLElement): void {
  closeBulkMenu();
  bulkMenuEl = document.createElement('div');
  bulkMenuEl.className = 'bulk-dropdown';
  const allItems = document.querySelectorAll('.chat-item');
  const allSelected = allItems.length > 0 && selectedIds.size === allItems.length;
  bulkMenuEl.innerHTML = `<button class="bulk-dropdown-item" id="bulkSelectAllOpt">${allSelected ? 'Deselect All' : 'Select All'}</button>`;
  document.body.appendChild(bulkMenuEl);
  const r = anchor.getBoundingClientRect();
  let top = r.bottom + 4;
  let left = r.right - (bulkMenuEl.offsetWidth || 120);
  if (left < 8) left = 8;
  if (top + 40 > window.innerHeight) top = r.top - 40;
  bulkMenuEl.style.top = `${top}px`;
  bulkMenuEl.style.left = `${left}px`;
  requestAnimationFrame(() => bulkMenuEl?.classList.add('visible'));
  bulkMenuEl.querySelector('#bulkSelectAllOpt')?.addEventListener('click', () => toggleSelectAll());
}

function closeBulkMenu(): void { if (bulkMenuEl) { bulkMenuEl.remove(); bulkMenuEl = null; } }

function showDeleteConfirmation(): void {
  const count = selectedIds.size;
  if (count === 0) return;
  closeBulkMenu();
  const overlay = document.createElement('div');
  overlay.className = 'bulk-delete-overlay';
  overlay.innerHTML = `<div class="bulk-delete-modal"><div class="bdm-icon-wrap">${ICON_TRASH_LG}</div><h3 class="bdm-title">Delete ${count} Chat${count > 1 ? 's' : ''}?</h3><p class="bdm-desc">This action is permanent and cannot be undone.</p><div class="bdm-actions"><button class="bdm-btn bdm-cancel">Cancel</button><button class="bdm-btn bdm-confirm">Delete Permanently</button></div></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  overlay.querySelector('.bdm-cancel')?.addEventListener('click', () => closeModalOverlay(overlay));
  overlay.querySelector('.bdm-confirm')?.addEventListener('click', () => { executeBulkDelete(); closeModalOverlay(overlay); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModalOverlay(overlay); });
  const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') { closeModalOverlay(overlay); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);
}

function closeModalOverlay(overlay: HTMLElement): void { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200); }

function executeBulkDelete(): void {
  const idsToDelete = Array.from(selectedIds);
  idsToDelete.forEach(id => {
    getAllTabs().filter(t => t.sessionId === id).forEach(tab => closeTab(tab.id));
    deleteSession(id);
  });
  exitSelectionMode();
  renderAll();
}

function renderAll(): void {
  const content = document.querySelector('.sidebar-content');
  if (!content) return;
  const allSessions = getAllSessions();
  const sorted = [...allSessions].sort((a, b) => b.updatedAt - a.updatedAt);
  let html = '';
  if (selectionMode) {
    html += `<div class="bulk-bar-sticky"><button class="bb-cancel" id="bulkCancelBtn">Cancel</button><span class="bb-count" id="bulkCount">${selectedIds.size}</span><button class="bb-delete" id="bulkDeleteBtn" title="Delete selected">${ICON_DELETE}<span class="bb-delete-text">Delete</span></button><button class="bb-dots" id="bulkDotsBtn" title="More options">${ICON_DOTS}</button></div>`;
  } else {
    html += `<div class="bulk-bar-sticky bulk-bar-normal"><span class="section-label">All Chats</span></div>`;
  }
  html += `<div class="chat-list-area">`;
  if (sorted.length > 0) {
    const groups = groupByDate(sorted);
    for (const group of groups) {
      html += `<div class="chat-group"><div class="chat-group-label">${group.label}</div>`;
      for (const s of group.items) {
        const active = !selectionMode && s.id === getCurrentSession()?.id ? ' active' : '';
        const sel = selectionMode && selectedIds.has(s.id) ? ' selected' : '';
        const checkIcon = selectionMode && selectedIds.has(s.id) ? ICON_CHECK : '';
        const checkedClass = selectionMode && selectedIds.has(s.id) ? ' checked' : '';
        if (selectionMode) {
          html += `<div class="chat-item${sel}" data-id="${s.id}"><span class="select-circle${checkedClass}">${checkIcon}</span><span class="chat-item-icon">${ICON_CHAT}</span><span class="chat-item-title">${esc(s.title)}</span></div>`;
        } else {
          html += `<div class="chat-item${active}" data-id="${s.id}"><span class="chat-item-icon">${ICON_CHAT}</span><span class="chat-item-title">${esc(s.title)}</span><button class="chat-item-menu" title="More options">${ICON_DOTS}</button></div>`;
        }
      }
      html += `</div>`;
    }
  } else {
    html += `<div class="sidebar-empty-state"><span>No chats yet</span></div>`;
  }
  html += `</div>`;
  content.innerHTML = html;
  wireEvents();
  if (selectionMode) updateSelectionUI();
}

function groupByDate(sessions: ChatSession[]): Array<{ label: string; items: ChatSession[] }> {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0); const t = t0.getTime();
  const b = [{ label: 'Today', items: [] as ChatSession[] }, { label: 'Yesterday', items: [] as ChatSession[] }, { label: 'Previous 7 Days', items: [] as ChatSession[] }, { label: 'Previous 30 Days', items: [] as ChatSession[] }, { label: 'Older', items: [] as ChatSession[] }];
  for (const s of sessions) {
    if (s.updatedAt >= t) b[0].items.push(s);
    else if (s.updatedAt >= t - 86400000) b[1].items.push(s);
    else if (s.updatedAt >= t - 7 * 86400000) b[2].items.push(s);
    else if (s.updatedAt >= t - 30 * 86400000) b[3].items.push(s);
    else b[4].items.push(s);
  }
  return b.filter(g => g.items.length > 0);
}

function wireEvents(): void {
  const content = document.querySelector('.sidebar-content');
  if (!content) return;
  if (selectionMode) {
    const cancelBtn = document.getElementById('bulkCancelBtn');
    const deleteBtn = document.getElementById('bulkDeleteBtn');
    const dotsBtn = document.getElementById('bulkDotsBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => exitSelectionMode());
    if (deleteBtn) deleteBtn.addEventListener('click', () => showDeleteConfirmation());
    if (dotsBtn) dotsBtn.addEventListener('click', (e) => { e.stopPropagation(); openBulkMenu(dotsBtn as HTMLElement); });
    content.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', (e) => { e.stopPropagation(); const id = (item as HTMLElement).dataset.id; if (id) toggleSelect(id); });
    });
    return;
  }
  content.querySelectorAll('.chat-item').forEach(item => {
    const el = item as HTMLElement; const id = el.dataset.id;
    item.addEventListener('click', e => {
      if ((e.target as HTMLElement).closest('.chat-item-menu')) return;
      if (id) {
        setActiveWorkspaceFilter(null);
        loadSession(id);
        if (isMobile()) closeMobileSidebar();
      }
    });
    item.addEventListener('dblclick', e => { e.preventDefault(); if (id) { enterSelectionMode(); selectedIds.add(id); updateSelectionUI(); } });
    item.addEventListener('mousedown', () => { if (!id) return; longPressTimer = setTimeout(() => { enterSelectionMode(); selectedIds.add(id); updateSelectionUI(); }, 500); });
    item.addEventListener('mouseup', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });
    item.addEventListener('mouseleave', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });
    item.addEventListener('touchstart', () => { if (!id) return; longPressTimer = setTimeout(() => { enterSelectionMode(); selectedIds.add(id); updateSelectionUI(); }, 500); }, { passive: true });
    item.addEventListener('touchend', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });
  });
  content.querySelectorAll('.chat-item-menu').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); const item = (btn as HTMLElement).closest('.chat-item') as HTMLElement; const id = item?.dataset.id; const title = item?.querySelector('.chat-item-title')?.textContent || ''; if (id) openChatMenu(btn as HTMLElement, id, title); });
  });
}

function openChatMenu(anchor: HTMLElement, sessionId: string, currentTitle: string): void {
  closeMenu();
  menuEl = document.createElement('div');
  menuEl.className = 'chat-menu';
  menuEl.innerHTML = `<button class="chat-menu-btn rename-btn">${ICON_RENAME}<span>Rename</span></button><button class="chat-menu-btn delete-btn">${ICON_DELETE}<span>Delete</span></button>`;
  document.body.appendChild(menuEl);
  positionMenu(anchor);
  menuEl.querySelector('.rename-btn')?.addEventListener('click', () => { if (menuEl) showChatRename(menuEl, sessionId, currentTitle); });
  menuEl.querySelector('.delete-btn')?.addEventListener('click', () => {
    getAllTabs().filter(t => t.sessionId === sessionId).forEach(tab => closeTab(tab.id));
    deleteSession(sessionId);
    renderAll();
    closeMenu();
    if (!getCurrentSession()) document.dispatchEvent(new Event('asuum:welcome-mode'));
  });
}

function showChatRename(menu: HTMLElement, sessionId: string, currentTitle: string): void {
  menu.innerHTML = `<div class="chat-menu-rename"><input class="chat-menu-input" type="text" value="${esc(currentTitle)}" maxlength="42"/><div class="chat-menu-rename-actions"><button class="rename-save" title="Save">${ICON_SAVE}</button><button class="rename-cancel" title="Cancel">${ICON_CANCEL}</button></div></div>`;
  const input = menu.querySelector('.chat-menu-input') as HTMLInputElement;
  input.focus(); input.select();
  const save = () => { const v = input.value.trim(); if (v) renameSession(sessionId, v); closeMenu(); };
  menu.querySelector('.rename-save')?.addEventListener('click', save);
  menu.querySelector('.rename-cancel')?.addEventListener('click', () => closeMenu());
  input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') closeMenu(); });
}

function positionMenu(anchor: HTMLElement): void {
  if (!menuEl) return;
  const r = anchor.getBoundingClientRect(), mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
  let left = Math.max(8, Math.min(r.right - mw, window.innerWidth - mw - 8));
  let top = r.bottom + 6;
  if (top + mh > window.innerHeight - 8) top = r.top - mh - 6;
  menuEl.style.top = `${top}px`;
  menuEl.style.left = `${left}px`;
}

function closeMenu(): void { if (menuEl) { menuEl.remove(); menuEl = null; } }
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }