/**
 * chat-rules-ui.ts — FULL PLACEHOLDER VISIBLE
 * Bigger textarea, full examples readable without scroll
 */

import {
  QUICK_RULES,
  loadChatRules,
  saveChatRules,
  clearChatRules,
  hasActiveRules,
} from '../services/chat-rules-store';
import { notifyRulesChanged } from '../collaboration';

const MAX_CHARS = 500;
const WARNING_CHARS = 450;

const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const ICON_INFO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

const HUB_LOGO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
const SVG_MAXIMIZE = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1" y="1" width="8" height="8" rx="1"/></svg>`;
const SVG_RESTORE = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="1" width="6" height="6" rx="0.8"/><rect x="1" y="3" width="6" height="6" rx="0.8"/><path d="M3 3V1.8A0.8 0.8 0 0 1 3.8 1H7" stroke-opacity="0.3"/></svg>`;

let injected = false;
let toastEl: HTMLElement | null = null;

// ✅ FULL READABLE PLACEHOLDER — Visible without scroll
const MODAL_HTML = `
<div class="cr-overlay" id="crOverlay">
  <div class="cr-modal" id="crModal">

    <div class="cr-titlebar">
      <div class="cr-titlebar-left">
        <div class="cr-titlebar-logo">${HUB_LOGO}</div>
        <span class="cr-titlebar-text">Chat Rules</span>
      </div>
      <div class="cr-win-controls">
        <button class="cr-win-btn" id="crMaxBtn" title="Maximize">${SVG_MAXIMIZE}</button>
        <button class="cr-win-btn cr-close" id="crCloseBtn" title="Close (Esc)">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/></svg>
        </button>
      </div>
    </div>

    <div class="cr-body">
      <div class="cr-section">
        <span class="cr-section-label">Quick Rules</span>
        <div class="cr-chips" id="crChips"></div>
      </div>

      <div class="cr-section">
        <div class="cr-section-head">
          <span class="cr-section-label">Custom Rules</span>
          <span class="cr-counter" id="crCounter">0 / ${MAX_CHARS}</span>
        </div>
        <textarea
          class="cr-textarea"
          id="crTextarea"
          maxlength="${MAX_CHARS}"
          placeholder="Add your own custom rules here...

Examples you can try:
• Always respond in concise format
• Include code examples when relevant
• Use professional tone
• Explain step by step"></textarea>
        <div class="cr-progress-wrap" id="crProgressWrap">
          <div class="cr-progress-bar" id="crProgressBar"></div>
        </div>
      </div>

      <div class="cr-status empty" id="crStatus">
        No active rules — responses will be general
      </div>
    </div>

    <div class="cr-footer">
      <div class="cr-hint">
        <kbd>⌘</kbd> <kbd>↵</kbd> to save
      </div>
      <div class="cr-footer-actions">
        <button class="cr-clear-btn" id="crClearBtn">
          ${ICON_TRASH}
          <span>Clear</span>
        </button>
        <button class="cr-save-btn" id="crSaveBtn">
          <span>Save Rules</span>
        </button>
      </div>
    </div>
  </div>
</div>
`;

export function initializeChatRulesUI(): void {
  console.log('📜 Chat Rules UI Initialized (Full Placeholder)');
  injectModal();
  wireModal();
  wireKeyboardShortcuts();
  refreshRulesDot();
}

function injectModal(): void {
  if (injected) return;
  document.querySelectorAll('#crOverlay, #chatRulesContainer').forEach((el) => el.remove());
  const root = document.getElementById('app-root');
  if (!root) return;
  const wrapper = document.createElement('div');
  wrapper.id = 'chatRulesContainer';
  wrapper.innerHTML = MODAL_HTML;
  root.appendChild(wrapper);
  injected = true;

  if (!document.querySelector('.cr-toast')) {
    toastEl = document.createElement('div');
    toastEl.className = 'cr-toast';
    document.body.appendChild(toastEl);
  } else {
    toastEl = document.querySelector('.cr-toast');
  }
}

function wireModal(): void {
  const overlay = document.getElementById('crOverlay');
  const modal = document.getElementById('crModal');
  const closeBtn = document.getElementById('crCloseBtn');
  const maxBtn = document.getElementById('crMaxBtn');
  const chipsWrap = document.getElementById('crChips');
  const textarea = document.getElementById('crTextarea') as HTMLTextAreaElement | null;
  const saveBtn = document.getElementById('crSaveBtn');
  const clearBtn = document.getElementById('crClearBtn');

  if (!overlay || !modal || !chipsWrap || !textarea) return;

  chipsWrap.innerHTML = QUICK_RULES.map(
    (q) => `<button class="cr-chip" data-rule="${q.id}" type="button">${q.label}</button>`
  ).join('');

  chipsWrap.querySelectorAll<HTMLElement>('.cr-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      updateStatus();
    });
  });

  textarea.addEventListener('input', () => {
    updateCounter();
    updateProgress();
    updateStatus();
  });

  const close = (): void => {
    overlay.classList.remove('active');
  };

  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) close();
  });

  maxBtn?.addEventListener('click', () => {
    const isFull = modal.classList.toggle('full');
    maxBtn.innerHTML = isFull ? SVG_RESTORE : SVG_MAXIMIZE;
    maxBtn.title = isFull ? 'Restore Down' : 'Maximize';
  });

  saveBtn?.addEventListener('click', handleSave);
  clearBtn?.addEventListener('click', handleClear);
}

function wireKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('crOverlay');
    if (!overlay || !overlay.classList.contains('active')) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  });
}

function handleSave(): void {
  const chipsWrap = document.getElementById('crChips');
  const textarea = document.getElementById('crTextarea') as HTMLTextAreaElement | null;
  const saveBtn = document.getElementById('crSaveBtn');
  const overlay = document.getElementById('crOverlay');

  if (!chipsWrap || !textarea || !saveBtn || !overlay) return;
  if (saveBtn.classList.contains('saving')) return;

  saveBtn.classList.add('saving');
  const originalText = saveBtn.querySelector('span')?.textContent || 'Save Rules';
  if (saveBtn.querySelector('span')) {
    (saveBtn.querySelector('span') as HTMLElement).textContent = 'Saving';
  }

  setTimeout(() => {
    const quick = Array.from(chipsWrap.querySelectorAll<HTMLElement>('.cr-chip.active'))
      .map((c) => c.dataset.rule!);

    saveChatRules({ quick, custom: textarea.value.trim() });
    notifyRulesChanged();
    refreshRulesDot();

    saveBtn.classList.remove('saving');
    if (saveBtn.querySelector('span')) {
      (saveBtn.querySelector('span') as HTMLElement).textContent = originalText;
    }

    const activeCount = quick.length + (textarea.value.trim().length > 0 ? 1 : 0);
    if (activeCount === 0) {
      showToast('All rules cleared', 'info');
    } else {
      showToast(`${activeCount} rule${activeCount > 1 ? 's' : ''} saved successfully`, 'success');
    }
    overlay.classList.remove('active');
  }, 400);
}

function handleClear(): void {
  const chipsWrap = document.getElementById('crChips');
  const textarea = document.getElementById('crTextarea') as HTMLTextAreaElement | null;
  if (!chipsWrap || !textarea) return;

  const hasContent = chipsWrap.querySelectorAll('.cr-chip.active').length > 0 || textarea.value.trim().length > 0;
  if (hasContent && !confirm('Clear all rules? This cannot be undone.')) return;

  clearChatRules();
  chipsWrap.querySelectorAll('.cr-chip').forEach((c) => c.classList.remove('active'));
  textarea.value = '';
  updateCounter();
  updateProgress();
  updateStatus();
  notifyRulesChanged();
  refreshRulesDot();
  showToast('All rules cleared', 'info');
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  if (!toastEl) return;
  let icon = ICON_INFO;
  if (type === 'success') icon = ICON_CHECK;
  else if (type === 'error') icon = ICON_TRASH;
  toastEl.innerHTML = `${icon}<span>${message}</span>`;
  toastEl.className = `cr-toast ${type}`;
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
  setTimeout(() => { toastEl?.classList.remove('show'); }, 2800);
}

export function openRulesModal(): void {
  const overlay = document.getElementById('crOverlay');
  if (!overlay) return;
  const data = loadChatRules();
  document.querySelectorAll<HTMLElement>('#crChips .cr-chip').forEach((c) => {
    c.classList.toggle('active', data.quick.includes(c.dataset.rule || ''));
  });
  const textarea = document.getElementById('crTextarea') as HTMLTextAreaElement | null;
  if (textarea) textarea.value = data.custom;
  updateCounter();
  updateProgress();
  updateStatus();
  overlay.classList.add('active');
  setTimeout(() => { textarea?.focus(); }, 400);
}

export function refreshRulesDot(): void {
  const dot = document.getElementById('mmRulesDot');
  if (dot) dot.classList.toggle('on', hasActiveRules());
}

function updateCounter(): void {
  const textarea = document.getElementById('crTextarea') as HTMLTextAreaElement | null;
  const counter = document.getElementById('crCounter');
  if (!textarea || !counter) return;
  const len = textarea.value.length;
  counter.textContent = `${len} / ${MAX_CHARS}`;
  counter.classList.remove('warning', 'danger');
  if (len >= MAX_CHARS) counter.classList.add('danger');
  else if (len >= WARNING_CHARS) counter.classList.add('warning');
}

function updateProgress(): void {
  const textarea = document.getElementById('crTextarea') as HTMLTextAreaElement | null;
  const progressWrap = document.getElementById('crProgressWrap');
  const progressBar = document.getElementById('crProgressBar');
  if (!textarea || !progressWrap || !progressBar) return;
  const len = textarea.value.length;
  const percent = (len / MAX_CHARS) * 100;
  progressWrap.classList.toggle('visible', len > 0);
  progressBar.style.width = `${Math.min(100, percent)}%`;
  progressBar.classList.remove('warning', 'danger');
  textarea.classList.remove('warning', 'danger');
  if (len >= MAX_CHARS) {
    progressBar.classList.add('danger');
    textarea.classList.add('danger');
  } else if (len >= WARNING_CHARS) {
    progressBar.classList.add('warning');
    textarea.classList.add('warning');
  }
}

function updateStatus(): void {
  const status = document.getElementById('crStatus');
  if (!status) return;
  const activeChips = document.querySelectorAll('#crChips .cr-chip.active').length;
  const textarea = document.getElementById('crTextarea') as HTMLTextAreaElement | null;
  const hasCustom = !!textarea && textarea.value.trim().length > 0;
  const total = activeChips + (hasCustom ? 1 : 0);
  if (total === 0) {
    status.className = 'cr-status empty';
    status.innerHTML = 'No active rules — responses will be general';
  } else {
    status.className = 'cr-status has-rules';
    status.innerHTML = `<span class="cr-status-indicator"></span><span>${total} rule${total > 1 ? 's' : ''} active — applied to all responses</span>`;
  }
}