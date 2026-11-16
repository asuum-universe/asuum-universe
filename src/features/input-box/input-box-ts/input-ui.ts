/** input-ui.ts — TREE SELECTOR + PANEL-CENTRED FIXED INPUT + ZERO-JUMP REVEAL */
import { eventBus } from '../../../event-bus';
import { getAllSavedProviders } from '../../../core/crypto';
import { fetchModelsForProvider } from '../../../core/ai-router';

const MAX_HEIGHT = 200;
const MOBILE_BP = 768;
const ICON_MINIMIZE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
const ICON_EXPAND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
const ICON_ARROW = `<svg class="tree-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>`;
const ICON_TICK = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

let selectedProviderId = 'auto';
let selectedModelId = 'auto';
let dropdownOpen = false;
let expandedProviders = new Set<string>();
let cachedModelsMap: Record<string, string[]> = {};
let isFetching = false;

function getStored(key: string, fb: string): string {
  try { return localStorage.getItem(key) || fb; } catch { return fb; }
}
function save(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch {}
}
function isMobileView(): boolean {
  return window.matchMedia(`(max-width: ${MOBILE_BP}px)`).matches;
}
function emitGeometry(): void {
  document.dispatchEvent(new CustomEvent('asuum:input-geometry'));
}

export function getSelectedProvider(): string { return selectedProviderId; }
export function getSelectedModel(): string { return selectedModelId; }

/* ─────────────────────────────────────────────────────────────────────
   GEOMETRY ONLY — display / opacity / visibility ko touch NAHI karta.
   Open/close applyClosed() karta hai (display:none se — simple, reliable).
   ───────────────────────────────────────────────────────────────────── */
function setupResponsiveInput(
  inputContainer: HTMLElement,
  inputField: HTMLTextAreaElement,
  mainPanel: HTMLElement | null,
  isOpen: () => boolean
): { refresh: () => void } {
  const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BP}px)`);

  const DESKTOP_BOTTOM = '16px';
  const DESKTOP_RADIUS = '14px';
  const MOBILE_BOTTOM = 'calc(16px + env(safe-area-inset-bottom, 0px))';
  const MOBILE_RADIUS = '16px';
  const KEYBOARD_GAP_PX = 10;
  const KB_THRESHOLD = 80;
  const CLOSED_H = 44;

  const panelEl: HTMLElement | null =
    mainPanel ?? (inputContainer.closest('.main-panel') as HTMLElement | null);

  const set = (p: string, v: string): void => { inputContainer.style.setProperty(p, v, 'important'); };
  const unset = (p: string): void => { inputContainer.style.removeProperty(p); };

  const applyClosed = (): void => {
    const closed = !isOpen();
    const actions = inputContainer.querySelector('.input-actions') as HTMLElement | null;
    const closeB = inputContainer.querySelector('.input-close-btn') as HTMLElement | null;

    inputContainer.classList.toggle('input-closed', closed);

    if (closed) {
      set('height', `${CLOSED_H}px`);
      set('min-height', `${CLOSED_H}px`);
      set('background', 'transparent');
      set('border', 'none');
      set('box-shadow', 'none');
      set('padding', '0');
      set('cursor', 'pointer');
      inputField.style.setProperty('display', 'none', 'important');
      actions?.style.setProperty('display', 'none', 'important');
      closeB?.style.setProperty('display', 'none', 'important');
    } else {
      unset('height'); unset('min-height');
      unset('background'); unset('border'); unset('box-shadow');
      unset('padding'); unset('cursor');
      inputField.style.removeProperty('display');
      actions?.style.removeProperty('display');
      closeB?.style.removeProperty('display');
    }
  };

  const positionInput = (): void => {
    const mobile = mobileQuery.matches;
    const r = panelEl?.getBoundingClientRect();
    const panelLeft = r ? r.left : 0;
    const panelWidth = r && r.width > 0 ? r.width : window.innerWidth;

    const centerX = panelLeft + panelWidth / 2;
    const width = mobile
      ? Math.max(220, panelWidth - 20)
      : Math.min(panelWidth * 0.9, 760);

    set('position', 'fixed');
    set('left', `${Math.round(centerX)}px`);
    set('right', 'auto');
    set('top', 'auto');
    set('transform', 'translateX(-50%)');
    set('margin', '0');
    set('box-sizing', 'border-box');
    set('width', `${Math.round(width)}px`);
    set('max-width', `${Math.round(width)}px`);
    set('border-radius', mobile ? MOBILE_RADIUS : DESKTOP_RADIUS);
    set('z-index', '100');
    set('overflow', 'visible');
  };

  const applyAll = (): void => {
    positionInput();
    applyClosed();

    if (mobileQuery.matches) {
      const vv = window.visualViewport;
      const innerH = window.innerHeight;
      const vvH = vv ? vv.height : innerH;
      const vvTop = vv ? vv.offsetTop : 0;
      const kb = Math.max(0, Math.round(innerH - vvH - vvTop));
      const open = kb > KB_THRESHOLD;

      mainPanel?.classList.toggle('keyboard-open', open);
      set('bottom', open ? `${kb + KEYBOARD_GAP_PX}px` : MOBILE_BOTTOM);

      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);

      if (open && isOpen()) {
        const cm = document.querySelector('.chat-messages');
        if (cm) cm.scrollTop = cm.scrollHeight;
      }
    } else {
      mainPanel?.classList.remove('keyboard-open');
      set('bottom', DESKTOP_BOTTOM);
    }

    emitGeometry();
  };

  let posRaf: number | null = null;
  const schedule = (): void => {
    if (posRaf !== null) return;
    posRaf = requestAnimationFrame(() => { posRaf = null; applyAll(); });
  };

  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', applyAll);
  } else {
    (mobileQuery as unknown as { addListener: (fn: () => void) => void }).addListener(applyAll);
  }

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', () => { setTimeout(applyAll, 140); });

  if (panelEl && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => schedule()).observe(panelEl);
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule);
    window.visualViewport.addEventListener('scroll', schedule);
  }

  inputField.addEventListener('focus', () => {
    [0, 60, 140, 260, 400].forEach(d => setTimeout(schedule, d));
  });
  inputField.addEventListener('blur', () => {
    [0, 100, 240, 380].forEach(d => setTimeout(schedule, d));
  });

  document.addEventListener('asuum:chat-mode', () => setTimeout(schedule, 60));

  applyAll();
  setTimeout(applyAll, 50);
  setTimeout(applyAll, 300);

  return { refresh: applyAll };
}

export function initializeInputUI(): void {
  console.log('⌨️ Input UI (Zero-Jump Reveal · Panel-Centred Fixed)');

  const inputField = document.querySelector('.chat-input') as HTMLTextAreaElement | null;
  const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement | null;
  const plusBtn = document.querySelector('.plus-btn') as HTMLElement | null;
  const inputContainer = document.querySelector('.input-container') as HTMLElement | null;
  const actionsBar = document.querySelector('.input-actions') as HTMLElement | null;
  const mainPanel = document.getElementById('mainPanel');

  if (!inputField || !inputContainer || !actionsBar) return;

  let inputOpen = true;
  const inputApi = setupResponsiveInput(inputContainer, inputField, mainPanel, () => inputOpen);

  selectedProviderId = getStored('asuum_selected_provider', 'auto');
  selectedModelId = getStored('asuum_selected_model', 'auto');

  inputContainer.querySelectorAll('.input-close-btn, .input-reveal-zone, .provider-selector-wrap').forEach(el => el.remove());
  document.querySelectorAll('.input-fixed-reveal').forEach(el => el.remove());

  const selectorWrap = document.createElement('div');
  selectorWrap.className = 'provider-selector-wrap';

  const trigger = document.createElement('button');
  trigger.className = 'provider-trigger';
  trigger.type = 'button';
  trigger.title = 'Select Provider & Model';
  trigger.setAttribute('aria-haspopup', 'tree');
  trigger.setAttribute('aria-expanded', 'false');

  const dropdown = document.createElement('div');
  dropdown.className = 'provider-dropdown';
  dropdown.setAttribute('role', 'tree');

  function updateTriggerLabel(): void {
    let label = 'Auto';
    if (selectedProviderId !== 'auto') {
      label = selectedProviderId.charAt(0).toUpperCase() + selectedProviderId.slice(1);
      if (selectedModelId !== 'auto') {
        const short = selectedModelId.length > 16 ? selectedModelId.slice(0, 14) + '…' : selectedModelId;
        label += ' / ' + short;
      }
    }
    trigger.innerHTML = '<span class="provider-label">' + label + '</span>';
  }

  function isWelcomeMode(): boolean {
    const panel = document.getElementById('mainPanel');
    return !!panel && !panel.classList.contains('chat-active');
  }

  function applyDropdownPosition(): void {
    const above = isMobileView() || !isWelcomeMode();
    dropdown.classList.toggle('pos-above', above);
    dropdown.classList.toggle('pos-below', !above);
  }

  function syncDropdownHeight(): void {
    if (!isMobileView()) { dropdown.style.removeProperty('max-height'); return; }
    const r = selectorWrap.getBoundingClientRect();
    const vvOffset = window.visualViewport?.offsetTop ?? 0;
    const available = r.top - vvOffset - 16;
    const cap = window.innerWidth <= 480 ? 222 : 240;
    const h = Math.max(120, Math.min(available, cap));
    dropdown.style.setProperty('max-height', `${h}px`, 'important');
  }

  async function buildDropdownContent(): Promise<DocumentFragment> {
    const frag = document.createDocumentFragment();

    const isAutoActive = selectedProviderId === 'auto' && selectedModelId === 'auto';
    const autoRow = document.createElement('button');
    autoRow.type = 'button';
    autoRow.className = 'tree-item tree-auto' + (isAutoActive ? ' active' : '');
    autoRow.innerHTML = '<span class="tree-label">Auto (Smart)</span>' + (isAutoActive ? '<span class="tree-tick">' + ICON_TICK + '</span>' : '');
    autoRow.onclick = (e) => { e.stopPropagation(); select('auto', 'auto'); };
    frag.appendChild(autoRow);

    let savedIds: string[] = [];
    try { savedIds = await getAllSavedProviders(); } catch { savedIds = []; }

    if (savedIds.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tree-empty';
      empty.textContent = 'No keys connected';
      frag.appendChild(empty);
      return frag;
    }

    for (const pid of savedIds) {
      const isExpanded = expandedProviders.has(pid);

      const sep = document.createElement('div');
      sep.className = 'tree-sep';
      frag.appendChild(sep);

      const provRow = document.createElement('button');
      provRow.type = 'button';
      provRow.className = 'tree-item tree-provider' + (isExpanded ? ' expanded' : '');
      provRow.setAttribute('aria-expanded', String(isExpanded));
      provRow.innerHTML =
        '<span class="tree-arrow-wrap">' + ICON_ARROW + '</span>' +
        '<span class="tree-label">' + pid.charAt(0).toUpperCase() + pid.slice(1) + '</span>';
      provRow.onclick = (e) => {
        e.stopPropagation();
        if (expandedProviders.has(pid)) expandedProviders.delete(pid);
        else expandedProviders.add(pid);
        requestAnimationFrame(async () => {
          const newFrag = await buildDropdownContent();
          dropdown.innerHTML = '';
          dropdown.appendChild(newFrag);
          syncDropdownHeight();
        });
      };
      frag.appendChild(provRow);

      if (isExpanded) {
        const models = cachedModelsMap[pid];
        if (!models) {
          const loading = document.createElement('div');
          loading.className = 'tree-loading';
          loading.dataset.provider = pid;
          loading.textContent = 'Loading models...';
          frag.appendChild(loading);

          if (!isFetching) {
            isFetching = true;
            fetchModelsForProvider(pid).then((fetched) => {
              cachedModelsMap[pid] = fetched;
              isFetching = false;
              if (expandedProviders.has(pid) && dropdownOpen) {
                requestAnimationFrame(async () => {
                  const newFrag = await buildDropdownContent();
                  dropdown.innerHTML = '';
                  dropdown.appendChild(newFrag);
                  syncDropdownHeight();
                });
              }
            }).catch(() => {
              cachedModelsMap[pid] = [];
              isFetching = false;
              if (dropdownOpen) {
                requestAnimationFrame(async () => {
                  const newFrag = await buildDropdownContent();
                  dropdown.innerHTML = '';
                  dropdown.appendChild(newFrag);
                  syncDropdownHeight();
                });
              }
            });
          }
        } else {
          const isAutoModActive = selectedProviderId === pid && selectedModelId === 'auto';
          const autoModRow = document.createElement('button');
          autoModRow.type = 'button';
          autoModRow.className = 'tree-item tree-model' + (isAutoModActive ? ' active' : '');
          autoModRow.innerHTML = '<span class="tree-label">Auto Model</span>' + (isAutoModActive ? '<span class="tree-tick">' + ICON_TICK + '</span>' : '');
          autoModRow.onclick = (e) => { e.stopPropagation(); select(pid, 'auto'); };
          frag.appendChild(autoModRow);

          if (models.length === 0) {
            const none = document.createElement('div');
            none.className = 'tree-empty';
            none.textContent = 'No models available';
            frag.appendChild(none);
          }

          for (const mid of models) {
            const isActive = selectedProviderId === pid && selectedModelId === mid;

            const mSep = document.createElement('div');
            mSep.className = 'tree-sep tree-sep-model';
            frag.appendChild(mSep);

            const modRow = document.createElement('button');
            modRow.type = 'button';
            modRow.className = 'tree-item tree-model' + (isActive ? ' active' : '');
            modRow.innerHTML = '<span class="tree-label">' + mid + '</span>' + (isActive ? '<span class="tree-tick">' + ICON_TICK + '</span>' : '');
            modRow.onclick = (e) => { e.stopPropagation(); select(pid, mid); };
            frag.appendChild(modRow);
          }
        }
      }
    }

    return frag;
  }

  async function refreshDropdown(): Promise<void> {
    const frag = await buildDropdownContent();
    dropdown.innerHTML = '';
    dropdown.appendChild(frag);
    syncDropdownHeight();
  }

  function select(provId: string, modId: string): void {
    selectedProviderId = provId;
    selectedModelId = modId;
    save('asuum_selected_provider', provId);
    save('asuum_selected_model', modId);
    updateTriggerLabel();
    closeDropdown();
    document.dispatchEvent(new CustomEvent('asuum:provider-changed', { detail: { provider: provId, model: modId } }));
  }

  async function openDropdown(): Promise<void> {
    dropdownOpen = true;
    applyDropdownPosition();
    syncDropdownHeight();
    selectorWrap.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    await refreshDropdown();
  }

  function closeDropdown(): void {
    dropdownOpen = false;
    selectorWrap.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  async function toggleDropdown(e?: Event): Promise<void> {
    if (e) e.stopPropagation();
    if (dropdownOpen) closeDropdown();
    else await openDropdown();
  }

  updateTriggerLabel();
  trigger.addEventListener('click', toggleDropdown);
  document.addEventListener('click', (e: MouseEvent) => {
    if (dropdownOpen && !selectorWrap.contains(e.target as Node)) closeDropdown();
  });
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && dropdownOpen) closeDropdown();
  });

  const refreshOpenDropdown = (): void => {
    if (!dropdownOpen) return;
    applyDropdownPosition();
    syncDropdownHeight();
  };
  window.addEventListener('resize', refreshOpenDropdown);
  window.addEventListener('orientationchange', () => { setTimeout(refreshOpenDropdown, 150); });
  window.visualViewport?.addEventListener('resize', refreshOpenDropdown);
  document.addEventListener('asuum:input-geometry', refreshOpenDropdown);

  selectorWrap.appendChild(trigger);
  selectorWrap.appendChild(dropdown);
  actionsBar.insertBefore(selectorWrap, actionsBar.firstChild);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'input-close-btn';
  closeBtn.type = 'button';
  closeBtn.title = 'Minimize input';
  closeBtn.innerHTML = ICON_MINIMIZE;
  inputContainer.appendChild(closeBtn);

  const fixedReveal = document.createElement('div');
  fixedReveal.className = 'input-fixed-reveal';
  const line = document.createElement('div');
  line.className = 'input-reveal-line';
  const box = document.createElement('button');
  box.className = 'input-reveal-box';
  box.type = 'button';
  box.title = 'Open input';
  box.setAttribute('aria-label', 'Open input');
  box.innerHTML = ICON_EXPAND;
  line.appendChild(box);
  fixedReveal.appendChild(line);
  document.body.appendChild(fixedReveal);

  /* ───────────────────────────────────────────────────────────────────
     ✅ ZERO-JUMP REVEAL — close button ki EXACT jagah
     Close se pehle button ka centre capture → reveal wahin center.
     Container bottom-anchored hai (height change se bottom edge same),
     isliye open→close→open pe spot bilkul nahi hilta.
     ─────────────────────────────────────────────────────────────────── */
  const REVEAL_H = 16;
  let revealAnchor: { x: number; y: number } | null = null;

  const measureCloseCenter = (): { x: number; y: number } | null => {
    const r = closeBtn.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    const c = inputContainer.getBoundingClientRect();
    if (c.width <= 0) return null;
    const bh = closeBtn.offsetHeight || 20;
    return { x: c.left + c.width / 2, y: c.bottom - bh / 2 };
  };

  const placeRevealAtAnchor = (): void => {
    if (!revealAnchor) revealAnchor = measureCloseCenter();
    if (!revealAnchor) return;
    const topValue =
      `max(2px, min(${Math.round(revealAnchor.y - REVEAL_H / 2)}px, calc(100% - ${REVEAL_H}px - env(safe-area-inset-bottom, 0px))))`;
    fixedReveal.style.setProperty('position', 'fixed', 'important');
    fixedReveal.style.setProperty('display', 'flex', 'important');
    fixedReveal.style.setProperty('height', `${REVEAL_H}px`, 'important');
    fixedReveal.style.setProperty('top', topValue, 'important');
    fixedReveal.style.setProperty('bottom', 'auto', 'important');
    fixedReveal.style.setProperty('left', `${Math.round(revealAnchor.x)}px`, 'important');
    fixedReveal.style.setProperty('right', 'auto', 'important');
    fixedReveal.style.setProperty('transform', 'translateX(-50%)', 'important');
    fixedReveal.style.setProperty('overflow', 'visible', 'important');
  };

  const hideReveal = (): void => {
    fixedReveal.style.setProperty('display', 'none', 'important');
  };

  hideReveal();

  document.addEventListener('asuum:welcome-mode', () => {
    if (inputOpen) return;
    inputOpen = true;
    revealAnchor = null;
    hideReveal();
    inputApi.refresh();
    setTimeout(() => {
      inputField.style.height = '';
      inputField.style.minHeight = '';
      inputField.style.maxHeight = '';
      inputField.style.overflowY = '';
      inputApi.refresh();
    }, 60);
  });

  /* ✅ TOGGLE — 300ms guard, close se pehle anchor capture */
  let lastToggleAt = 0;
  const toggleInput = (e?: Event): void => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const now = Date.now();
    if (now - lastToggleAt < 300) return;
    lastToggleAt = now;

    inputOpen = !inputOpen;
    closeDropdown();

    if (inputOpen) {
      revealAnchor = null;
      hideReveal();
      inputApi.refresh();
      setTimeout(() => {
        inputField.style.height = '';
        inputField.style.minHeight = '';
        inputField.style.maxHeight = '';
        inputField.style.overflowY = '';
        inputField.focus();
        inputApi.refresh();
      }, 60);
    } else {
      /* Button visible hai abhi — exact centre capture karo */
      revealAnchor = measureCloseCenter();
      inputField.blur();
      inputApi.refresh();
      requestAnimationFrame(() => placeRevealAtAnchor());
      setTimeout(() => placeRevealAtAnchor(), 120);
    }
  };

  closeBtn.addEventListener('click', toggleInput);
  box.addEventListener('click', toggleInput);
  line.addEventListener('click', toggleInput);
  inputContainer.addEventListener('click', (e: MouseEvent) => {
    if (inputOpen) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.closest('.input-close-btn') || t.closest('.provider-selector-wrap'))) return;
    toggleInput(e);
  });

  /* Resize / rotate / keyboard → naye container centre pe re-measure (no jump) */
  const repositionRevealIfClosed = (): void => {
    if (inputOpen) return;
    revealAnchor = measureCloseCenter();
    placeRevealAtAnchor();
  };
  window.addEventListener('resize', repositionRevealIfClosed);
  window.addEventListener('orientationchange', () => { setTimeout(repositionRevealIfClosed, 150); });
  window.visualViewport?.addEventListener('resize', () => { setTimeout(repositionRevealIfClosed, 60); });
  document.addEventListener('asuum:input-geometry', repositionRevealIfClosed);

  const autoResize = (): void => {
    if (!inputOpen) return;
    if (inputField.value.trim() === '') {
      inputField.style.height = '';
      inputField.style.overflowY = 'hidden';
      if (sendBtn) sendBtn.disabled = true;
      emitGeometry();
      return;
    }
    inputField.style.height = 'auto';
    inputField.style.overflowY = 'hidden';
    const sh = inputField.scrollHeight;
    if (sh > MAX_HEIGHT) { inputField.style.height = MAX_HEIGHT + 'px'; inputField.style.overflowY = 'auto'; }
    else { inputField.style.height = sh + 'px'; inputField.style.overflowY = 'hidden'; }
    if (sendBtn) sendBtn.disabled = inputField.value.trim().length === 0;
    if (dropdownOpen) syncDropdownHeight();
    emitGeometry();
  };

  const sendMessage = (): void => {
    const text = inputField.value.trim();
    if (!text) return;
    eventBus.emit('NEW_MESSAGE', { text, sender: 'user', provider: selectedProviderId, model: selectedModelId });
    document.dispatchEvent(new Event('asuum:message-sent'));
    inputField.value = '';
    inputField.style.height = '';
    inputField.style.overflowY = 'hidden';
    inputField.dispatchEvent(new Event('input'));
    if (sendBtn) sendBtn.disabled = true;
  };

  inputField.addEventListener('input', autoResize);
  inputField.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
  });
  if (sendBtn) { sendBtn.addEventListener('click', sendMessage); sendBtn.disabled = true; }
  if (plusBtn) { plusBtn.addEventListener('click', () => { console.log('➕ Plus clicked'); }); }
  autoResize();
  inputApi.refresh();
}