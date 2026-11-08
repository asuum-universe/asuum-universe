/**
 * palette-ui.ts — PREMIUM COMMAND PALETTE (V1 CLEAN)
 * ✅ Fixed: Uses getAllTabs instead of removed getAllWorkspaces
 * ✅ Security: HTML escaping on all user content
 * ✅ No workspace dependencies — works with tabs-only architecture
 */

import { Command, getStaticCommands } from '../services/palette-commands';
import { getAllSessions, loadSession, deleteSession } from '../../chat-screen/services/chat-store';
import { getAllTabs, switchTab } from '../../header/services/header-tabs-store';

const ICON_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const ICON_TAB = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`;
const ICON_MORE = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const ICON_ARCHIVE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`;
const ICON_EMPTY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;

let overlayEl: HTMLElement | null = null;
let inputEl: HTMLInputElement | null = null;
let listEl: HTMLElement | null = null;
let flatCommands: Command[] = [];
let selectedIndex = 0;
let injected = false;
let activeDropdown: HTMLElement | null = null;
let activeDropdownBtn: HTMLElement | null = null;

export function initializeCommandPaletteUI(): void {
  console.log('⌘ Command Palette Initialized (V1 Clean)');
  if (injected) return;
  injectPalette();
  wireGlobalShortcut();
  injected = true;
}

function injectPalette(): void {
  overlayEl = document.createElement('div');
  overlayEl.className = 'cp-overlay';
  overlayEl.id = 'cpOverlay';
  overlayEl.innerHTML = `
    <div class="cp-panel">
      <div class="cp-input-row">
        <span class="cp-search-icon">${ICON_SEARCH}</span>
        <input class="cp-input" id="cpInput" type="text" placeholder="Type a command or jump to a chat…" autocomplete="off" spellcheck="false" />
        <span class="cp-kbd">ESC</span>
      </div>
      <div class="cp-list" id="cpList"></div>
      <div class="cp-footer">
        <span class="cp-hint"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span class="cp-hint"><kbd>↵</kbd> select</span>
        <span class="cp-hint"><kbd>esc</kbd> close</span>
        <span class="cp-hint" style="margin-left: auto; color: #d4d4d8;">⌘K</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlayEl);

  inputEl = overlayEl.querySelector('#cpInput') as HTMLInputElement;
  listEl = overlayEl.querySelector('#cpList') as HTMLElement;

  inputEl?.addEventListener('input', () => render());
  inputEl?.addEventListener('keydown', onInputKeydown);

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closePalette();
  });

  listEl?.addEventListener('scroll', () => closeDropdown());

  document.addEventListener('click', (e) => {
    if (activeDropdown) {
      const path = e.composedPath();
      if (!path.includes(activeDropdown) && !path.includes(activeDropdownBtn!)) {
        closeDropdown();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeDropdown) {
      closeDropdown();
    }
  });
}

function wireGlobalShortcut(): void {
  document.addEventListener('keydown', (e) => {
    const isK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
    if (isK) {
      e.preventDefault();
      togglePalette();
    }
  });
}

function togglePalette(): void {
  if (overlayEl?.classList.contains('open')) closePalette();
  else openPalette();
}

function openPalette(): void {
  if (!overlayEl || !inputEl) return;
  overlayEl.classList.add('open');
  inputEl.value = '';
  selectedIndex = 0;
  render();
  setTimeout(() => inputEl?.focus(), 80);
}

function closePalette(): void {
  closeDropdown();
  overlayEl?.classList.remove('open');
}

/**
 * ✅ FIXED: Uses getAllTabs() instead of removed getAllWorkspaces()
 * Shows open tabs as navigable items
 */
function buildCommands(): Command[] {
  const cmds: Command[] = [...getStaticCommands()];

  // Add recent chats
  getAllSessions().slice(0, 12).forEach(s => {
    cmds.push({
      id: `chat-${s.id}`,
      label: s.title,
      icon: ICON_CHAT,
      keywords: ['chat', 'jump', 'open', 'conversation', s.title.toLowerCase()],
      group: 'Chats',
      action: () => loadSession(s.id),
    });
  });

  // ✅ Add open tabs (replaces workspaces)
  getAllTabs()
    .filter(tab => tab.sessionId !== null)
    .forEach(tab => {
      cmds.push({
        id: `tab-${tab.id}`,
        label: tab.title,
        icon: ICON_TAB,
        keywords: ['tab', 'open', 'switch', tab.title.toLowerCase()],
        group: 'Tabs',
        action: () => switchTab(tab.id),
      });
    });

  return cmds;
}

function scoreCommand(cmd: Command, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const label = cmd.label.toLowerCase();
  const hay = (label + ' ' + (cmd.keywords || []).join(' ')).toLowerCase();

  if (label === q) return 150;
  if (label.startsWith(q)) return 100;
  if (label.includes(q)) return 80;
  if (hay.includes(q)) return 60;

  let i = 0;
  for (const ch of hay) {
    if (ch === q[i]) i++;
    if (i === q.length) return 30;
  }

  return 0;
}

function render(): void {
  if (!listEl || !inputEl) return;
  closeDropdown();
  const query = inputEl.value.trim();

  const scored = buildCommands()
    .map(cmd => ({ cmd, score: scoreCommand(cmd, query) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  flatCommands = scored.map(x => x.cmd);
  if (selectedIndex >= flatCommands.length) selectedIndex = 0;
  if (flatCommands.length === 0) selectedIndex = -1;

  if (flatCommands.length === 0) {
    listEl.innerHTML = `
      <div class="cp-empty">
        <div class="cp-empty-icon">${ICON_EMPTY}</div>
        <p class="cp-empty-title">No results found</p>
        <p class="cp-empty-text">
          No matches for <span class="cp-empty-query">${escapeHtml(query || 'empty')}</span>
        </p>
      </div>
    `;
    return;
  }

  const groups: Array<{ name: string; items: Command[] }> = [];
  const order = ['Actions', 'Chats', 'Tabs'];
  order.forEach(g => {
    const items = flatCommands.filter(c => c.group === g);
    if (items.length) groups.push({ name: g, items });
  });

  let html = '';
  groups.forEach(g => {
    html += `<div class="cp-group-label">${escapeHtml(g.name)}</div>`;
    g.items.forEach(cmd => {
      const idx = flatCommands.indexOf(cmd);
      const isChat = cmd.group === 'Chats';
      const sessionId = isChat ? cmd.id.replace('chat-', '') : null;

      html += `
        <div class="cp-item${idx === selectedIndex ? ' selected' : ''}" data-idx="${idx}">
          <span class="cp-item-icon">${cmd.icon}</span>
          <span class="cp-item-label">${escapeHtml(cmd.label)}</span>
          ${isChat && sessionId ? `<button class="cp-item-menu-btn" data-session-id="${escapeHtml(sessionId)}" data-title="${escapeHtml(cmd.label)}" title="Options">${ICON_MORE}</button>` : ''}
          ${cmd.shortcut ? `<span class="cp-item-shortcut">${escapeHtml(cmd.shortcut)}</span>` : ''}
        </div>`;
    });
  });

  listEl.innerHTML = html;

  listEl.querySelectorAll<HTMLElement>('.cp-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.cp-item-menu-btn')) return;
      const idx = Number(item.dataset.idx);
      executeIndex(idx);
    });
    item.addEventListener('mousemove', () => {
      const idx = Number(item.dataset.idx);
      if (idx !== selectedIndex) {
        selectedIndex = idx;
        highlightSelected();
      }
    });
  });

  listEl.querySelectorAll<HTMLElement>('.cp-item-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sessionId = btn.dataset.sessionId;
      const title = btn.dataset.title || '';
      if (sessionId) openDropdown(btn, sessionId, title);
    });
  });
}

function highlightSelected(): void {
  if (!listEl) return;
  listEl.querySelectorAll<HTMLElement>('.cp-item').forEach(el => {
    const idx = Number(el.dataset.idx);
    el.classList.toggle('selected', idx === selectedIndex);
  });
  const sel = listEl.querySelector('.cp-item.selected');
  if (sel) {
    sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function openDropdown(btn: HTMLElement, sessionId: string, title: string): void {
  closeDropdown();

  const dropdown = document.createElement('div');
  dropdown.className = 'cp-item-dropdown';
  dropdown.innerHTML = `
    <button class="cp-menu-option" data-action="recovery">
      ${ICON_ARCHIVE}
      <span>Recovery</span>
    </button>
    <button class="cp-menu-option danger" data-action="delete">
      ${ICON_TRASH}
      <span>Delete Permanently</span>
    </button>
  `;
  document.body.appendChild(dropdown);

  const rect = btn.getBoundingClientRect();
  const dw = dropdown.offsetWidth;
  const dh = dropdown.offsetHeight;

  let left = rect.right - dw;
  left = Math.max(8, Math.min(left, window.innerWidth - dw - 8));

  let top = rect.bottom + 6;
  if (top + dh > window.innerHeight - 8) {
    top = rect.top - dh - 6;
  }

  dropdown.style.left = `${left}px`;
  dropdown.style.top = `${top}px`;

  activeDropdown = dropdown;
  activeDropdownBtn = btn;

  dropdown.querySelector('[data-action="recovery"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDropdown();
    handleRecovery(sessionId, title);
  });

  dropdown.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDropdown();
    handleDelete(sessionId, title);
  });
}

function closeDropdown(): void {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
    activeDropdownBtn = null;
  }
}

function handleRecovery(sessionId: string, title: string): void {
  console.log(`📦 Recovery: ${title}`);
  alert(`Recovery feature coming soon for "${title}"`);
  closePalette();
}

function handleDelete(sessionId: string, title: string): void {
  const confirmed = confirm(`Delete "${title}" permanently? This cannot be undone.`);
  if (confirmed) {
    deleteSession(sessionId);
    console.log(`🗑️ Chat deleted: ${title}`);
    closePalette();
  }
}

function onInputKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (flatCommands.length === 0) return;
    selectedIndex = (selectedIndex + 1) % flatCommands.length;
    highlightSelected();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (flatCommands.length === 0) return;
    selectedIndex = (selectedIndex - 1 + flatCommands.length) % flatCommands.length;
    highlightSelected();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (selectedIndex >= 0) executeIndex(selectedIndex);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    if (activeDropdown) {
      closeDropdown();
    } else {
      closePalette();
    }
  }
}

function executeIndex(idx: number): void {
  const cmd = flatCommands[idx];
  if (!cmd) return;
  closePalette();
  setTimeout(() => cmd.action(), 80);
}

/**
 * ✅ Security: Escape ALL user-generated content before rendering
 */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}