/**
 * model-hub-ui.ts — SHARED REGISTRY + EYE TOGGLE
 * ✅ Imports from shared providers.ts (single source of truth)
 * ✅ Eye toggle for show/hide key
 * ✅ Auto-detect + auto-URL for all known providers
 * ✅ Unknown key → name + URL fields
 * ✅ No duplicate registry — zero sync bugs
 */
import { saveApiKey, deleteApiKey, getAllSavedProviders } from '../../../core/crypto';
import { PROVIDER_REGISTRY, detectProviderFromApiKey } from '../../../core/providers';

// ============================================================
// UI CARDS — Display info for Get Key links
// ============================================================
interface ProviderCard {
  id: string; name: string; desc: string; color: string;
  icon: string; getKeyUrl: string;
}

const CARDS: ProviderCard[] = [
  { id: 'groq', name: 'Groq', desc: 'Fastest inference engine', color: '#f55036',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#f55036" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    getKeyUrl: 'https://console.groq.com/keys' },
  { id: 'gemini', name: 'Google Gemini', desc: 'Multimodal reasoning', color: '#4285f4',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg>',
    getKeyUrl: 'https://aistudio.google.com/apikey' },
  { id: 'openrouter', name: 'OpenRouter', desc: '100+ models one API', color: '#6366f1',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4"/></svg>',
    getKeyUrl: 'https://openrouter.ai/settings/keys' },
  { id: 'xai', name: 'xAI Grok', desc: 'Grok models by xAI', color: '#000000',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l16 16M20 4L4 20"/></svg>',
    getKeyUrl: 'https://console.x.ai' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'Advanced reasoning models', color: '#1a73e8',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>',
    getKeyUrl: 'https://platform.deepseek.com/api_keys' },
  { id: 'nvidia', name: 'NVIDIA NIM', desc: 'GPU-accelerated AI', color: '#76b900',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#76b900" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>',
    getKeyUrl: 'https://build.nvidia.com/settings' },
];

function getDisplayName(providerId: string): string {
  const card = CARDS.find(c => c.id === providerId);
  if (card) return card.name;
  // ✅ Use shared registry instead of local copy
  if (PROVIDER_REGISTRY[providerId]) return PROVIDER_REGISTRY[providerId].displayName;
  try {
    const raw = localStorage.getItem('asuum_custom_' + providerId);
    if (raw) { const cfg = JSON.parse(raw); if (cfg.displayName) return cfg.displayName; }
  } catch {}
  return providerId.replace(/^custom_/, '').replace(/_/g, ' ');
}

// Eye icons
const ICON_EYE_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_EYE_CLOSED = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

const ICON_KEYS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5"/><path d="M11.5 11.5L19 19"/><path d="M15 15l3-3"/><path d="M17 17l2-2"/></svg>';
const ICON_LOCAL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="12" rx="2.5"/><path d="M8 20h8"/><path d="M12 16v4"/><circle cx="7.5" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10" r="1.5" fill="currentColor" stroke="none"/></svg>';
const ICON_ACTIVE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l7.5 4.3v5.4c0 5.5-3.2 10.2-7.5 11.8-4.3-1.6-7.5-6.3-7.5-11.8V6.8L12 2.5z"/><polyline points="9 12.5 11 14.5 15.5 10" stroke-width="2.2"/></svg>';
const ICON_LOCAL_LG = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="12" rx="2.5"/><path d="M8 20h8"/><path d="M12 16v4"/><circle cx="7.5" cy="10" r="1.5" fill="#ccc" stroke="none"/><circle cx="16.5" cy="10" r="1.5" fill="#ccc" stroke="none"/></svg>';
const HUB_LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';
const SVG_MAXIMIZE = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1" y="1" width="8" height="8" rx="1"/></svg>';
const SVG_RESTORE = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="1" width="6" height="6" rx="0.8"/><rect x="1" y="3" width="6" height="6" rx="0.8"/><path d="M3 3V1.8A0.8 0.8 0 0 1 3.8 1H7" stroke-opacity="0.3"/></svg>';

let toastEl: HTMLElement | null = null;
let curTab = 'keys';
let initialized = false;
let savedProviderIds: string[] = [];

export function initializeModelHubUI(): void {
  const overlay = document.getElementById('mhOverlay');
  const modal = document.getElementById('mhModal');
  const content = document.getElementById('mhContent');
  const openBtn = document.getElementById('modelHubBtn');
  if (overlay && modal && content && openBtn) setup(overlay, modal, content, openBtn);
  else buildFromScratch();
}

function buildFromScratch(): void {
  let btn = document.getElementById('modelHubBtn') as HTMLButtonElement | null;
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'modelHubBtn'; btn.className = 'sb-action-btn model-hub-btn'; btn.title = 'Model Hub';
    btn.innerHTML = '<svg class="sb-icon-hub" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><span class="sb-btn-text">Model Hub</span>';
    (document.querySelector('.sb-middle') || document.querySelector('.sidebar-content') || document.body).appendChild(btn);
  }
  const ov = document.createElement('div'); ov.id = 'mhOverlay'; ov.className = 'mh-overlay';
  const md = document.createElement('div'); md.id = 'mhModal'; md.className = 'mh-modal';
  const tb = document.createElement('div'); tb.className = 'mh-titlebar';
  const left = document.createElement('div'); left.className = 'mh-titlebar-left';
  const logo = document.createElement('div'); logo.className = 'mh-titlebar-logo'; logo.innerHTML = HUB_LOGO;
  const tt = document.createElement('span'); tt.className = 'mh-titlebar-text'; tt.textContent = 'Model Hub';
  left.appendChild(logo); left.appendChild(tt);
  const ctrl = document.createElement('div'); ctrl.className = 'mh-win-controls';
  const mx = document.createElement('button'); mx.className = 'mh-win-btn'; mx.id = 'mhMaxBtn'; mx.title = 'Maximize'; mx.innerHTML = SVG_MAXIMIZE;
  const cl = document.createElement('button'); cl.className = 'mh-win-btn mh-close'; cl.id = 'mhCloseBtn'; cl.title = 'Close';
  cl.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/></svg>';
  ctrl.appendChild(mx); ctrl.appendChild(cl); tb.appendChild(left); tb.appendChild(ctrl);
  const tabBar = document.createElement('div'); tabBar.className = 'mh-tabs-bar';
  const t1 = document.createElement('button'); t1.className = 'mh-tab active'; t1.setAttribute('data-tab', 'keys'); t1.innerHTML = ICON_KEYS + '<span>API Keys</span>';
  const t2 = document.createElement('button'); t2.className = 'mh-tab'; t2.setAttribute('data-tab', 'local'); t2.innerHTML = ICON_LOCAL + '<span>Local Models</span>';
  const t3 = document.createElement('button'); t3.className = 'mh-tab'; t3.setAttribute('data-tab', 'active'); t3.innerHTML = ICON_ACTIVE + '<span>Connected</span>';
  tabBar.appendChild(t1); tabBar.appendChild(t2); tabBar.appendChild(t3);
  const ct = document.createElement('div'); ct.id = 'mhContent'; ct.className = 'mh-content';
  md.appendChild(tb); md.appendChild(tabBar); md.appendChild(ct); ov.appendChild(md); document.body.appendChild(ov);
  setup(ov, md, ct, btn);
}

function setup(overlay: HTMLElement, modal: HTMLElement, content: HTMLElement, openBtn: HTMLElement): void {
  if (initialized) return;
  initialized = true;
  toastEl = document.querySelector('.mh-toast') as HTMLElement;
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'mh-toast'; document.body.appendChild(toastEl); }

  const doOpen = async () => { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; await refreshSaved(); render(); };
  const doClose = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; };
  openBtn.onclick = (e) => { e.preventDefault(); doOpen(); };
  modal.querySelector('.mh-close')?.addEventListener('click', doClose);
  const maxBtn = modal.querySelector('#mhMaxBtn') as HTMLElement;
  if (maxBtn) maxBtn.onclick = () => { const f = modal.classList.toggle('full'); maxBtn.innerHTML = f ? SVG_RESTORE : SVG_MAXIMIZE; };
  overlay.onclick = (e) => { if (e.target === overlay) doClose(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) doClose(); });
  modal.querySelectorAll('.mh-tab').forEach(t => {
    t.addEventListener('click', async () => {
      curTab = (t as HTMLElement).getAttribute('data-tab') || 'keys';
      modal.querySelectorAll('.mh-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      await refreshSaved(); render();
    });
  });
  // ✅ Count from shared registry
  refreshSaved().then(() => { render(); console.log('✅ Model Hub Ready (' + Object.keys(PROVIDER_REGISTRY).length + ' providers)'); });

  async function refreshSaved() { try { savedProviderIds = await getAllSavedProviders(); } catch { savedProviderIds = []; } }

  function render() {
    if (curTab === 'keys') content.innerHTML = buildKeys();
    else if (curTab === 'local') content.innerHTML = '<div class="mh-soon">' + ICON_LOCAL_LG + '<h3>Local Models</h3><p>Ollama, LM Studio & llama.cpp<br/>coming in next update</p><span class="mh-soon-badge">Coming Soon</span></div>';
    else content.innerHTML = buildActive();
    bind(content);
  }

  function buildKeys(): string {
    // ✅ Count from shared registry
    const count = Object.keys(PROVIDER_REGISTRY).length;
    let h = `<div class="mh-paste-section">
      <div class="mh-paste-header">
        <h3>Paste Any API Key</h3>
        <p>Auto-detects provider from key prefix. No URL needed for ${count} supported providers.</p>
      </div>
      <div class="mh-paste-row">
        <div class="mh-input-wrap">
          <input type="password" id="universalKeyInput" class="mh-universal-input" placeholder="Paste your API key here" autocomplete="off">
          <button type="button" id="eyeToggleBtn" class="mh-eye-btn" title="Show/Hide key">${ICON_EYE_OPEN}</button>
        </div>
        <button id="universalConnectBtn" class="mh-btn mh-btn-go" disabled>Connect</button>
      </div>
      <div id="universalDetected" class="mh-detected-badge" style="display:none"></div>
      <div class="mh-custom-fields" id="customFieldsRow" style="display:none">
        <input type="text" id="customName" class="mh-custom-name-input" placeholder="Provider name (e.g. My Custom AI)">
        <input type="url" id="customBaseUrl" class="mh-custom-url-input" placeholder="Base URL (e.g. https://api.provider.com/v1)">
      </div>
    </div>`;

    h += '<div class="mh-providers-label">Get API Keys</div><div class="mh-cards-grid">';
    for (const c of CARDS) {
      const on = savedProviderIds.includes(c.id);
      h += `<div class="mh-card${on ? ' connected' : ''}"><div class="mh-logo" style="background:${c.color}15">${c.icon}</div><div class="mh-info"><p class="mh-name">${c.name}</p><p class="mh-desc">${on ? '✅ Connected' : c.desc}</p></div><div class="mh-actions">${on ? '<span class="mh-connected-badge">Active</span>' : '<a class="mh-link" href="' + c.getKeyUrl + '" target="_blank">Get Key ↗</a>'}</div></div>`;
    }
    h += '</div>';
    return h;
  }

  function buildActive(): string {
    if (!savedProviderIds.length) return '<div class="mh-empty">No connections yet.<br/>Go to API Keys tab to add a provider.</div>';
    let h = '<div class="mh-cards-grid">';
    for (const pid of savedProviderIds) {
      const name = getDisplayName(pid);
      const card = CARDS.find(c => c.id === pid);
      const icon = card ? card.icon : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg>';
      const color = card ? card.color : '#6366f1';
      h += `<div class="mh-card on"><div class="mh-logo" style="background:${color}15">${icon}</div><div class="mh-info"><p class="mh-name">${name}</p><p class="mh-desc">🔒 Encrypted & Secure</p></div><div class="mh-actions"><button class="mh-btn mh-btn-rm" data-d="${pid}">Remove</button></div></div>`;
    }
    h += '</div>';
    return h;
  }

  function bind(el: HTMLElement) {
    const uniInput = el.querySelector('#universalKeyInput') as HTMLInputElement;
    const uniBtn = el.querySelector('#universalConnectBtn') as HTMLButtonElement;
    const detectedBadge = el.querySelector('#universalDetected') as HTMLElement;
    const customFieldsRow = el.querySelector('#customFieldsRow') as HTMLElement;
    const customNameInput = el.querySelector('#customName') as HTMLInputElement;
    const customUrlInput = el.querySelector('#customBaseUrl') as HTMLInputElement;
    const eyeBtn = el.querySelector('#eyeToggleBtn') as HTMLButtonElement;

    let detectedInfo: { id: string; baseUrl: string; displayName: string } | null = null;
    let isCustomProvider = false;
    let keyVisible = false;

    // ✅ EYE TOGGLE
    if (eyeBtn && uniInput) {
      eyeBtn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        keyVisible = !keyVisible;
        uniInput.type = keyVisible ? 'text' : 'password';
        eyeBtn.innerHTML = keyVisible ? ICON_EYE_CLOSED : ICON_EYE_OPEN;
        eyeBtn.title = keyVisible ? 'Hide key' : 'Show key';
        uniInput.focus();
      };
    }

    if (uniInput && uniBtn) {
      uniInput.oninput = () => {
        const key = uniInput.value.trim();
        detectedInfo = null;
        isCustomProvider = false;

        if (key.length < 8) {
          uniBtn.disabled = true;
          detectedBadge.style.display = 'none';
          customFieldsRow.style.display = 'none';
          uniInput.classList.remove('ok');
          return;
        }

        // ✅ AUTO-DETECT from shared providers.ts
        const detected = detectProviderFromApiKey(key);
        if (detected) {
          detectedInfo = detected;
          detectedBadge.textContent = '✓ Detected: ' + detected.displayName + ' — URL auto-configured';
          detectedBadge.className = 'mh-detected-badge show ok';
          detectedBadge.style.display = 'block';
          customFieldsRow.style.display = 'none';
          uniBtn.disabled = savedProviderIds.includes(detected.id);
          uniInput.classList.add('ok');
          if (savedProviderIds.includes(detected.id)) {
            detectedBadge.textContent = '⚠ ' + detected.displayName + ' already connected';
            detectedBadge.className = 'mh-detected-badge show warn';
          }
        } else {
          isCustomProvider = true;
          detectedBadge.textContent = '? Unknown provider — enter name + URL below';
          detectedBadge.className = 'mh-detected-badge show warn';
          detectedBadge.style.display = 'block';
          customFieldsRow.style.display = 'flex';
          uniInput.classList.remove('ok');
          validateCustom();
        }
      };

      function validateCustom() {
        if (!isCustomProvider) return;
        const name = customNameInput?.value.trim() || '';
        const url = customUrlInput?.value.trim() || '';
        const key = uniInput.value.trim();
        uniBtn.disabled = !(name.length > 0 && url.startsWith('http') && key.length > 8);
      }
      if (customNameInput) customNameInput.oninput = validateCustom;
      if (customUrlInput) customUrlInput.oninput = validateCustom;

      uniBtn.onclick = async () => {
        const key = uniInput.value.trim();
        if (!key) return;
        let providerId = detectedInfo?.id || null;
        let displayName = '';

        if (isCustomProvider || !providerId) {
          const name = customNameInput?.value.trim() || '';
          const url = customUrlInput?.value.trim().replace(/\/+$/, '') || '';
          if (!name || !url.startsWith('http')) { toast('Enter provider name + valid URL', 'err'); return; }
          const safeId = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
          providerId = safeId;
          displayName = name;
          localStorage.setItem('asuum_custom_' + safeId, JSON.stringify({ baseUrl: url, displayName: name }));
        } else {
          displayName = detectedInfo?.displayName || providerId;
        }

        if (savedProviderIds.includes(providerId)) { toast(displayName + ' already connected', 'err'); return; }

        uniBtn.textContent = 'Saving...'; uniBtn.disabled = true;
        try {
          await saveApiKey(providerId, key);
          await refreshSaved();
          toast(displayName + ' connected! 🔒', 'ok');
          uniInput.value = '';
          uniInput.classList.remove('ok');
          uniInput.type = 'password';
          keyVisible = false;
          if (eyeBtn) eyeBtn.innerHTML = ICON_EYE_OPEN;
          detectedBadge.style.display = 'none';
          customFieldsRow.style.display = 'none';
          if (customNameInput) customNameInput.value = '';
          if (customUrlInput) customUrlInput.value = '';
          uniBtn.textContent = 'Connect';
          render();
        } catch (e) {
          toast('Failed: ' + (e instanceof Error ? e.message : String(e)), 'err');
          uniBtn.textContent = 'Connect'; uniBtn.disabled = false;
        }
      };
    }

    el.querySelectorAll<HTMLButtonElement>('[data-d]').forEach(b => {
      b.onclick = async () => {
        const id = b.getAttribute('data-d') || '';
        const name = getDisplayName(id);
        if (!confirm('Disconnect ' + name + '?')) return;
        try {
          await deleteApiKey(id);
          if (id.startsWith('custom_')) localStorage.removeItem('asuum_custom_' + id);
          await refreshSaved(); toast(name + ' removed', 'err'); render();
        } catch (e) { toast('Failed: ' + (e instanceof Error ? e.message : e), 'err'); }
      };
    });
  }

  function toast(msg: string, type: string) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.className = 'mh-toast show ' + type;
    setTimeout(() => { if (toastEl) toastEl.className = 'mh-toast'; }, 3500);
  }
}