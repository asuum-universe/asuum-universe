/**
 * model-hub-ui.ts — SHARED REGISTRY · EYE TOGGLE · SHELL BADGE · ACTIVE CARDS
 * ✅ Connected providers API-keys list se hat kar sirf Connected tab mein
 * ✅ Active card = neutral base + brand accent rail + corner glow (not full green)
 * ✅ Shell badge icon fully visible — no clipping
 * ✅ Zero emoji, XSS-safe names, Asuum theme sync
 */
import { saveApiKey, deleteApiKey, getAllSavedProviders } from '../../../core/crypto';
import { PROVIDER_REGISTRY, detectProviderFromApiKey } from '../../../core/providers';

/* ============================================================
   ICONS
   ============================================================ */
const svg = (body: string, w = 2): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/* ✅ Badge check — safe margins, thicker stroke, 13px render pe crisp */
const I_CHECK_BADGE =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4.5 10.4 8.2 14 15.5 6.4"/></svg>';

const I_CHECK_CIRCLE = svg('<circle cx="12" cy="12" r="9.5"/><polyline points="8 12.4 10.8 15.2 16.2 9.4"/>', 1.9);
const I_LOCK = svg('<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.4"/><path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0v2.9"/><circle cx="12" cy="15.6" r="1.15" fill="currentColor" stroke="none"/>', 1.8);
const I_EXTERNAL = svg('<path d="M13.5 4.5H19.5V10.5"/><path d="M19.5 4.5L11 13"/><path d="M18 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4"/>', 1.9);
const I_TRASH = svg('<polyline points="3.5 6.5 20.5 6.5"/><path d="M18.5 6.5v13a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-13"/><path d="M9.5 6.5V4.6a1.6 1.6 0 0 1 1.6-1.6h1.8a1.6 1.6 0 0 1 1.6 1.6v1.9"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>', 1.8);
const I_ALERT = svg('<path d="M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13.4"/><circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none"/>', 1.9);
const I_HELP = svg('<circle cx="12" cy="12" r="9.5"/><path d="M9.4 9.2a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.2-2.6 4"/><circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/>', 1.9);
const I_KEY = svg('<circle cx="8" cy="8" r="4.6"/><path d="M11.4 11.4L19.6 19.6"/><path d="M15.2 15.2l2.6-2.6"/><path d="M17.4 17.4l2-2"/>', 1.8);
const I_SHIELD = svg('<path d="M12 2.6l7.6 4.3v5.5c0 5.5-3.2 10.3-7.6 11.9-4.4-1.6-7.6-6.4-7.6-11.9V6.9L12 2.6z"/><polyline points="9 12.4 11.1 14.5 15.4 10.2"/>', 1.8);
const I_CPU = svg('<rect x="6.5" y="6.5" width="11" height="11" rx="2.2"/><rect x="9.8" y="9.8" width="4.4" height="4.4" rx="1"/><path d="M10 2.8v3.7M14 2.8v3.7M10 17.5v3.7M14 17.5v3.7M2.8 10h3.7M2.8 14h3.7M17.5 10h3.7M17.5 14h3.7"/>', 1.7);
const I_MONITOR = svg('<rect x="2.5" y="4" width="19" height="12.5" rx="2.4"/><path d="M8.5 20.5h7"/><path d="M12 16.5v4"/>', 1.7);
const I_DOWNLOAD = svg('<path d="M20.5 15.5v3.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-3.2"/><polyline points="7.6 10.6 12 15 16.4 10.6"/><line x1="12" y1="15" x2="12" y2="3.4"/>', 1.8);
const I_SLIDERS = svg('<line x1="4" y1="7.5" x2="20" y2="7.5"/><line x1="4" y1="16.5" x2="20" y2="16.5"/><circle cx="9.5" cy="7.5" r="2.4"/><circle cx="15" cy="16.5" r="2.4"/>', 1.8);
const I_BOLT = svg('<path d="M13.4 2.5 4.6 13.6h6.2l-1.2 7.9 8.8-11.1h-6.2l1.2-7.9z"/>', 1.7);
const I_LAYERS = svg('<path d="M12 2.6 2.6 7.3 12 12l9.4-4.7L12 2.6z"/><path d="M2.6 16.7 12 21.4l9.4-4.7"/><path d="M2.6 12 12 16.7 21.4 12"/>', 1.8);
const I_LINK_OFF = svg('<path d="M9.5 14.5 14.5 9.5"/><path d="M13 6.5l1.6-1.6a3.7 3.7 0 0 1 5.2 5.2L18.2 11.7"/><path d="M11 17.5l-1.6 1.6a3.7 3.7 0 0 1-5.2-5.2L5.8 12.3"/>', 1.8);
const I_HASH = svg('<line x1="5" y1="9.5" x2="19" y2="9.5"/><line x1="5" y1="14.5" x2="19" y2="14.5"/><line x1="10.5" y1="4" x2="8.8" y2="20"/><line x1="15.2" y1="4" x2="13.5" y2="20"/>', 1.8);
const I_EYE_OPEN = svg('<path d="M1.8 12S5.6 4.6 12 4.6 22.2 12 22.2 12 18.4 19.4 12 19.4 1.8 12 1.8 12z"/><circle cx="12" cy="12" r="3.1"/>', 1.9);
const I_EYE_CLOSED = svg('<path d="M17.9 17.9A10.1 10.1 0 0 1 12 19.4C5.6 19.4 1.8 12 1.8 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.9A9.1 9.1 0 0 1 12 4.6c6.4 0 10.2 7.4 10.2 7.4a18.5 18.5 0 0 1-2.2 3.2m-6.7-1.1a3 3 0 1 1-4.2-4.2"/><line x1="2.2" y1="2.2" x2="21.8" y2="21.8"/>', 1.9);
const I_MAX = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1.6" y="1.6" width="8.8" height="8.8" rx="1.6"/></svg>';
const I_RESTORE = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3.6" y="1.6" width="6.8" height="6.8" rx="1.4"/><path d="M8.4 10.4H3a1.4 1.4 0 0 1-1.4-1.4V3.6"/></svg>';
const I_CLOSE = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2.6" y1="2.6" x2="9.4" y2="9.4"/><line x1="9.4" y1="2.6" x2="2.6" y2="9.4"/></svg>';
const I_HUB = svg('<path d="M12 2.6 2.6 7.3 12 12l9.4-4.7L12 2.6z"/><path d="M2.6 16.7 12 21.4l9.4-4.7"/><path d="M2.6 12 12 16.7 21.4 12"/>', 1.9);

/* ============================================================
   PROVIDER CARDS
   ============================================================ */
interface ProviderCard {
  id: string; name: string; desc: string; color: string;
  icon: string; getKeyUrl: string;
}

const brand = (color: string, body: string, w = 1.8): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const CARDS: ProviderCard[] = [
  { id: 'groq', name: 'Groq', desc: 'Fastest inference engine', color: '#f55036',
    icon: brand('#f55036', '<path d="M13.4 2.5 4.6 13.6h6.2l-1.2 7.9 8.8-11.1h-6.2l1.2-7.9z"/>'),
    getKeyUrl: 'https://console.groq.com/keys' },
  { id: 'gemini', name: 'Google Gemini', desc: 'Multimodal reasoning', color: '#4285f4',
    icon: brand('#4285f4', '<path d="M12 3.2c.6 4.3 3.3 7 7.6 7.6-4.3.6-7 3.3-7.6 7.6-.6-4.3-3.3-7-7.6-7.6 4.3-.6 7-3.3 7.6-7.6z"/>'),
    getKeyUrl: 'https://aistudio.google.com/apikey' },
  { id: 'openrouter', name: 'OpenRouter', desc: '100+ models, one API', color: '#6366f1',
    icon: brand('#6366f1', '<circle cx="12" cy="12" r="3"/><path d="M12 2.6v4M12 17.4v4M5.2 5.2l2.8 2.8M16 16l2.8 2.8M2.6 12h4M17.4 12h4M5.2 18.8 8 16M16 8l2.8-2.8"/>'),
    getKeyUrl: 'https://openrouter.ai/settings/keys' },
  { id: 'xai', name: 'xAI Grok', desc: 'Grok models by xAI', color: '#71717a',
    icon: brand('#a1a1aa', '<path d="M4.6 19.4 12.9 8.6M11.1 19.4h4.2l4.1-5.4M4.6 4.6h4.2l10.6 14.8"/>', 1.9),
    getKeyUrl: 'https://console.x.ai' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'Advanced reasoning models', color: '#1a73e8',
    icon: brand('#1a73e8', '<circle cx="11" cy="11" r="6.6"/><path d="M15.8 15.8 20.6 20.6"/><path d="M8.6 11h4.8M11 8.6v4.8"/>'),
    getKeyUrl: 'https://platform.deepseek.com/api_keys' },
  { id: 'nvidia', name: 'NVIDIA NIM', desc: 'GPU-accelerated inference', color: '#76b900',
    icon: brand('#76b900', '<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3"/><rect x="8.6" y="8.6" width="6.8" height="6.8" rx="1.4"/>'),
    getKeyUrl: 'https://build.nvidia.com/settings' },
];

/* ============================================================
   HELPERS
   ============================================================ */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getDisplayName(providerId: string): string {
  const card = CARDS.find(c => c.id === providerId);
  if (card) return card.name;
  const reg = PROVIDER_REGISTRY[providerId];
  if (reg) return reg.displayName;
  try {
    const raw = localStorage.getItem('asuum_custom_' + providerId);
    if (raw) {
      const cfg = JSON.parse(raw) as { displayName?: string };
      if (cfg.displayName) return cfg.displayName;
    }
  } catch { /* ignore */ }
  return providerId.replace(/^custom_/, '').replace(/_/g, ' ');
}

function shellBadge(label: string): string {
  return `<span class="mh-shell"><span class="mh-shell-ico">${I_CHECK_BADGE}</span><span class="mh-shell-txt">${esc(label)}</span></span>`;
}

function metaChip(icon: string, label: string, mono = false): string {
  return `<span class="mh-meta-chip${mono ? ' mono' : ''}">${icon}<span>${esc(label)}</span></span>`;
}

function genericIcon(color: string): string {
  return brand(color, '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.6v8.8M7.6 12h8.8"/>');
}

/* ============================================================
   STATE
   ============================================================ */
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
  document.querySelectorAll('#mhOverlay').forEach(n => n.remove());

  let btn = document.getElementById('modelHubBtn') as HTMLButtonElement | null;
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'modelHubBtn';
    btn.type = 'button';
    btn.className = 'sb-action-btn model-hub-btn';
    btn.title = 'Model Hub';
    btn.innerHTML = `<svg class="sb-icon-hub" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><span class="sb-btn-text">Model Hub</span>`;
    (document.querySelector('.sb-middle') || document.querySelector('.sidebar-content') || document.body).appendChild(btn);
  }

  const ov = document.createElement('div');
  ov.id = 'mhOverlay'; ov.className = 'mh-overlay';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Model Hub');

  const md = document.createElement('div');
  md.id = 'mhModal'; md.className = 'mh-modal';

  const tb = document.createElement('div'); tb.className = 'mh-titlebar';
  const left = document.createElement('div'); left.className = 'mh-titlebar-left';
  const logo = document.createElement('div'); logo.className = 'mh-titlebar-logo'; logo.innerHTML = I_HUB;
  const tt = document.createElement('span'); tt.className = 'mh-titlebar-text'; tt.textContent = 'Model Hub';
  const sub = document.createElement('span'); sub.className = 'mh-titlebar-sub'; sub.textContent = 'BYOK';
  left.append(logo, tt, sub);

  const ctrl = document.createElement('div'); ctrl.className = 'mh-win-controls';
  const mx = document.createElement('button');
  mx.type = 'button'; mx.className = 'mh-win-btn'; mx.id = 'mhMaxBtn';
  mx.title = 'Maximize'; mx.setAttribute('aria-label', 'Maximize'); mx.innerHTML = I_MAX;
  const cl = document.createElement('button');
  cl.type = 'button'; cl.className = 'mh-win-btn mh-close'; cl.id = 'mhCloseBtn';
  cl.title = 'Close'; cl.setAttribute('aria-label', 'Close'); cl.innerHTML = I_CLOSE;
  ctrl.append(mx, cl);
  tb.append(left, ctrl);

  const tabBar = document.createElement('div');
  tabBar.className = 'mh-tabs-bar';
  tabBar.setAttribute('role', 'tablist');
  tabBar.innerHTML =
    `<button class="mh-tab active" type="button" role="tab" aria-selected="true" data-tab="keys">${I_KEY}<span>API Keys</span></button>` +
    `<button class="mh-tab" type="button" role="tab" aria-selected="false" data-tab="local">${I_MONITOR}<span>Local Models</span></button>` +
    `<button class="mh-tab" type="button" role="tab" aria-selected="false" data-tab="active">${I_SHIELD}<span>Connected</span><span class="mh-tab-count zero">0</span></button>`;

  const ct = document.createElement('div');
  ct.id = 'mhContent'; ct.className = 'mh-content';

  md.append(tb, tabBar, ct);
  ov.appendChild(md);
  document.body.appendChild(ov);
  setup(ov, md, ct, btn);
}

function setup(overlay: HTMLElement, modal: HTMLElement, content: HTMLElement, openBtn: HTMLElement): void {
  if (initialized) return;
  initialized = true;

  toastEl = document.querySelector('.mh-toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'mh-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }

  const doOpen = async (): Promise<void> => {
    overlay.classList.add('open');
    await refreshSaved();
    render();
  };
  const doClose = (): void => { overlay.classList.remove('open'); };

  openBtn.onclick = (e) => { e.preventDefault(); void doOpen(); };
  modal.querySelector('.mh-close')?.addEventListener('click', doClose);

  const maxBtn = modal.querySelector('#mhMaxBtn') as HTMLButtonElement | null;
  if (maxBtn) {
    maxBtn.onclick = () => {
      const full = modal.classList.toggle('full');
      maxBtn.innerHTML = full ? I_RESTORE : I_MAX;
      maxBtn.title = full ? 'Restore' : 'Maximize';
      maxBtn.setAttribute('aria-label', full ? 'Restore' : 'Maximize');
    };
  }

  overlay.onclick = (e) => { if (e.target === overlay) doClose(); };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) doClose();
  });

  modal.querySelectorAll('.mh-tab').forEach(t => {
    t.addEventListener('click', async () => {
      curTab = (t as HTMLElement).getAttribute('data-tab') || 'keys';
      modal.querySelectorAll('.mh-tab').forEach(x => {
        x.classList.remove('active');
        x.setAttribute('aria-selected', 'false');
      });
      t.classList.add('active');
      t.setAttribute('aria-selected', 'true');
      await refreshSaved();
      render();
    });
  });

  void refreshSaved().then(() => {
    render();
    console.log('✅ Model Hub Ready (' + Object.keys(PROVIDER_REGISTRY).length + ' providers)');
  });

  async function refreshSaved(): Promise<void> {
    try { savedProviderIds = await getAllSavedProviders(); }
    catch { savedProviderIds = []; }
    syncTabCount(modal);
  }

  function render(): void {
    if (curTab === 'keys') content.innerHTML = buildKeys();
    else if (curTab === 'local') content.innerHTML = buildLocal();
    else content.innerHTML = buildActive();
    bind(content);
    content.scrollTop = 0;
  }

  /* ---------- API KEYS TAB (connected providers excluded) ---------- */
  function buildKeys(): string {
    const total = Object.keys(PROVIDER_REGISTRY).length;

    let h = `<div class="mh-paste-section">
      <div class="mh-paste-head">
        <span class="mh-paste-ico">${I_KEY}</span>
        <div class="mh-paste-txt">
          <h3>Paste any API key</h3>
          <p>Provider auto-detected from the key prefix. Base URL auto-configured for ${total} providers.</p>
        </div>
      </div>
      <div class="mh-paste-row">
        <div class="mh-input-wrap">
          <input type="password" id="universalKeyInput" class="mh-universal-input" placeholder="Paste your API key here" autocomplete="off" spellcheck="false" aria-label="API key">
          <button type="button" id="eyeToggleBtn" class="mh-eye-btn" title="Show key" aria-label="Show key">${I_EYE_OPEN}</button>
        </div>
        <button id="universalConnectBtn" class="mh-btn mh-btn-go" type="button" disabled>${I_LINK_OFF}<span>Connect</span></button>
      </div>
      <div id="universalDetected" class="mh-detected-badge"></div>
      <div class="mh-custom-fields" id="customFieldsRow">
        <input type="text" id="customName" class="mh-custom-name-input" placeholder="Provider name (e.g. My Custom AI)" autocomplete="off" spellcheck="false" aria-label="Provider name">
        <input type="url" id="customBaseUrl" class="mh-custom-url-input" placeholder="Base URL (e.g. https://api.provider.com/v1)" autocomplete="off" spellcheck="false" aria-label="Base URL">
      </div>
    </div>`;

    /* ✅ Connected providers yahan NAHI dikhenge — sirf Connected tab mein */
    const pending = CARDS.filter(c => !savedProviderIds.includes(c.id));

    if (pending.length === 0) {
      h += `<div class="mh-allset">
        <span class="mh-allset-ico">${I_CHECK_CIRCLE}</span>
        <div class="mh-allset-txt">
          <strong>All listed providers are connected</strong>
          <span>Manage or disconnect them from the Connected tab. You can still paste any other key above.</span>
        </div>
      </div>`;
    } else {
      h += `<div class="mh-section-head">
        <span class="mh-providers-label">Available providers</span>
        <span class="mh-section-line"></span>
        <span class="mh-section-meta">${pending.length} remaining</span>
      </div><div class="mh-cards-grid">`;

      for (const c of pending) {
        h += `<div class="mh-card" style="--mh-accent:${c.color}">
          <div class="mh-logo" style="background:${c.color}14">${c.icon}</div>
          <div class="mh-info">
            <p class="mh-name">${esc(c.name)}</p>
            <p class="mh-desc">${esc(c.desc)}</p>
          </div>
          <div class="mh-actions">
            <a class="mh-link" href="${esc(c.getKeyUrl)}" target="_blank" rel="noopener noreferrer">Get key ${I_EXTERNAL}</a>
          </div>
        </div>`;
      }
      h += '</div>';
    }

    const extra = Object.keys(PROVIDER_REGISTRY)
      .filter(id => !CARDS.some(c => c.id === id) && !savedProviderIds.includes(id))
      .map(id => PROVIDER_REGISTRY[id].displayName);
    if (extra.length) {
      h += `<div class="mh-also">
        <div class="mh-also-head">${I_BOLT}<span>Also auto-detected</span></div>
        <div class="mh-also-chips">${extra.map(n => `<span class="mh-also-chip">${esc(n)}</span>`).join('')}</div>
      </div>`;
    }
    return h;
  }

  /* ---------- CONNECTED TAB (brand-accent cards) ---------- */
  function buildActive(): string {
    if (!savedProviderIds.length) {
      return `<div class="mh-empty">
        <span class="mh-empty-ico">${I_SHIELD}</span>
        <h3>No connections yet</h3>
        <p>Paste an API key in the API Keys tab. Keys stay on this device, encrypted.</p>
      </div>`;
    }

    let h = `<div class="mh-section-head">
      <span class="mh-providers-label">Active connections</span>
      <span class="mh-section-line"></span>
      <span class="mh-section-meta">${savedProviderIds.length} secured</span>
    </div><div class="mh-cards-grid">`;

    for (const pid of savedProviderIds) {
      const name = getDisplayName(pid);
      const card = CARDS.find(c => c.id === pid);
      const color = card ? card.color : '#6366f1';
      const icon = card ? card.icon : genericIcon(color);
      const isCustom = pid.startsWith('custom_');

      h += `<div class="mh-card mh-active-card" style="--mh-accent:${color}">
        <div class="mh-logo" style="background:${color}14">${icon}</div>
        <div class="mh-info">
          <p class="mh-name">${esc(name)}</p>
          <div class="mh-meta-row">
            ${metaChip(I_LOCK, 'Encrypted')}
            ${isCustom ? metaChip(I_SLIDERS, 'Custom endpoint') : metaChip(I_BOLT, 'Auto URL')}
            ${metaChip(I_HASH, pid, true)}
          </div>
        </div>
        <div class="mh-actions">
          ${shellBadge('Active')}
          <button class="mh-btn mh-btn-rm mh-btn-icon" type="button" data-d="${esc(pid)}" title="Disconnect ${esc(name)}" aria-label="Disconnect ${esc(name)}">${I_TRASH}</button>
        </div>
      </div>`;
    }
    h += '</div>';
    return h;
  }

  /* ---------- LOCAL MODELS TAB ---------- */
  function buildLocal(): string {
    return `<div class="mh-local">
      <div class="mh-local-hero">
        <span class="mh-local-ico">${I_CPU}</span>
        <div class="mh-local-txt">
          <h3>Local Models <span class="mh-phase">${I_LAYERS}<span>Phase 1 · Next</span></span></h3>
          <p>On-device inference. No API key, no network, no cost. Models run in a worker so the UI stays smooth.</p>
        </div>
      </div>
      <div class="mh-roadmap">
        <div class="mh-road-item">
          <span class="mh-road-num">1</span>
          <div class="mh-road-body"><strong>Download &amp; load</strong><span>GGUF models with progress, pause and resume.</span></div>
        </div>
        <div class="mh-road-item">
          <span class="mh-road-num">2</span>
          <div class="mh-road-body"><strong>Stream &amp; stop</strong><span>Token-by-token output with stop and continue controls.</span></div>
        </div>
        <div class="mh-road-item">
          <span class="mh-road-num">3</span>
          <div class="mh-road-body"><strong>Tune &amp; optimise</strong><span>Presets, context size, threads and live speed meters.</span></div>
        </div>
      </div>
    </div>`;
  }

  /* ---------- BINDINGS ---------- */
  function bind(el: HTMLElement): void {
    const uniInput = el.querySelector('#universalKeyInput') as HTMLInputElement | null;
    const uniBtn = el.querySelector('#universalConnectBtn') as HTMLButtonElement | null;
    const detectedBadge = el.querySelector('#universalDetected') as HTMLElement | null;
    const customFieldsRow = el.querySelector('#customFieldsRow') as HTMLElement | null;
    const customNameInput = el.querySelector('#customName') as HTMLInputElement | null;
    const customUrlInput = el.querySelector('#customBaseUrl') as HTMLInputElement | null;
    const eyeBtn = el.querySelector('#eyeToggleBtn') as HTMLButtonElement | null;

    let detectedInfo: { id: string; baseUrl: string; displayName: string } | null = null;
    let isCustomProvider = false;
    let keyVisible = false;

    const setBadge = (kind: 'ok' | 'warn', icon: string, text: string): void => {
      if (!detectedBadge) return;
      detectedBadge.className = 'mh-detected-badge show ' + kind;
      detectedBadge.innerHTML = `<span class="mh-db-ico">${icon}</span><span class="mh-db-txt">${esc(text)}</span>`;
    };
    const hideBadge = (): void => {
      if (!detectedBadge) return;
      detectedBadge.className = 'mh-detected-badge';
      detectedBadge.innerHTML = '';
    };
    const setConnectLabel = (label: string, icon: string): void => {
      if (uniBtn) uniBtn.innerHTML = `${icon}<span>${esc(label)}</span>`;
    };

    if (eyeBtn && uniInput) {
      eyeBtn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        keyVisible = !keyVisible;
        uniInput.type = keyVisible ? 'text' : 'password';
        eyeBtn.innerHTML = keyVisible ? I_EYE_CLOSED : I_EYE_OPEN;
        eyeBtn.title = keyVisible ? 'Hide key' : 'Show key';
        eyeBtn.setAttribute('aria-label', keyVisible ? 'Hide key' : 'Show key');
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
          hideBadge();
          if (customFieldsRow) customFieldsRow.style.display = 'none';
          uniInput.classList.remove('ok');
          setConnectLabel('Connect', I_LINK_OFF);
          return;
        }

        const detected = detectProviderFromApiKey(key);
        if (detected) {
          detectedInfo = detected;
          if (customFieldsRow) customFieldsRow.style.display = 'none';
          uniInput.classList.add('ok');
          const already = savedProviderIds.includes(detected.id);
          uniBtn.disabled = already;
          if (already) {
            setBadge('warn', I_ALERT, detected.displayName + ' is already connected — see Connected tab');
            setConnectLabel('Connected', I_CHECK_CIRCLE);
          } else {
            setBadge('ok', I_CHECK_CIRCLE, 'Detected ' + detected.displayName + ' — base URL auto-configured');
            setConnectLabel('Connect', I_LINK_OFF);
          }
        } else {
          isCustomProvider = true;
          setBadge('warn', I_HELP, 'Unknown provider — add a name and base URL below');
          if (customFieldsRow) customFieldsRow.style.display = 'flex';
          uniInput.classList.remove('ok');
          setConnectLabel('Connect', I_LINK_OFF);
          validateCustom();
        }
      };

      function validateCustom(): void {
        if (!isCustomProvider || !uniInput || !uniBtn) return;
        const name = customNameInput?.value.trim() || '';
        const url = customUrlInput?.value.trim() || '';
        const key = uniInput.value.trim();
        uniBtn.disabled = !(name.length > 0 && /^https?:\/\//i.test(url) && key.length > 8);
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
          const url = (customUrlInput?.value.trim() || '').replace(/\/+$/, '');
          if (!name || !/^https?:\/\//i.test(url)) {
            toast('Enter a provider name and a valid URL', 'err');
            return;
          }
          providerId = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
          displayName = name;
          try {
            localStorage.setItem('asuum_custom_' + providerId, JSON.stringify({ baseUrl: url, displayName: name }));
          } catch { /* storage blocked */ }
        } else {
          displayName = detectedInfo?.displayName || providerId;
        }

        if (savedProviderIds.includes(providerId)) {
          toast(displayName + ' is already connected', 'err');
          return;
        }

        setConnectLabel('Saving…', I_DOWNLOAD);
        uniBtn.disabled = true;
        try {
          await saveApiKey(providerId, key);
          await refreshSaved();
          toast(displayName + ' connected · encrypted on this device', 'ok');

          uniInput.value = '';
          uniInput.classList.remove('ok');
          uniInput.type = 'password';
          keyVisible = false;
          if (eyeBtn) {
            eyeBtn.innerHTML = I_EYE_OPEN;
            eyeBtn.title = 'Show key';
            eyeBtn.setAttribute('aria-label', 'Show key');
          }
          hideBadge();
          if (customFieldsRow) customFieldsRow.style.display = 'none';
          if (customNameInput) customNameInput.value = '';
          if (customUrlInput) customUrlInput.value = '';
          detectedInfo = null;
          isCustomProvider = false;
          setConnectLabel('Connect', I_LINK_OFF);
          render();
        } catch (e) {
          toast('Failed: ' + (e instanceof Error ? e.message : String(e)), 'err');
          setConnectLabel('Connect', I_LINK_OFF);
          uniBtn.disabled = false;
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
          if (id.startsWith('custom_')) {
            try { localStorage.removeItem('asuum_custom_' + id); } catch { /* ignore */ }
          }
          await refreshSaved();
          toast(name + ' disconnected', 'err');
          render();
        } catch (e) {
          toast('Failed: ' + (e instanceof Error ? e.message : String(e)), 'err');
        }
      };
    });
  }

  function toast(msg: string, type: 'ok' | 'err'): void {
    if (!toastEl) return;
    const icon = type === 'ok' ? I_CHECK_CIRCLE : I_ALERT;
    toastEl.innerHTML = `<span class="mh-toast-ico">${icon}</span><span>${esc(msg)}</span>`;
    toastEl.className = 'mh-toast show ' + type;
    setTimeout(() => { if (toastEl) toastEl.className = 'mh-toast'; }, 3500);
  }
}

function syncTabCount(modal: HTMLElement): void {
  const pill = modal.querySelector('.mh-tab[data-tab="active"] .mh-tab-count');
  if (!pill) return;
  const n = savedProviderIds.length;
  pill.textContent = String(n);
  pill.classList.toggle('zero', n === 0);
}