/** input-ui.ts — SMOOTH NO-FLICKER TREE SELECTOR + AUTO RESPONSIVE INPUT */
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

export function getSelectedProvider(): string { return selectedProviderId; }
export function getSelectedModel(): string { return selectedModelId; }

/* ─────────────────────────────────────────────────────────────────────
   AUTO RESPONSIVE INPUT POSITIONING
   · Mobile → centered floating card, 10px side gaps
   · overflow VISIBLE → provider dropdown clip nahi hoti
   ───────────────────────────────────────────────────────────────────── */
function setupResponsiveInput(
  inputContainer: HTMLElement,
  _inputField: HTMLTextAreaElement,
  mainPanel: HTMLElement | null
): void {
  const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BP}px)`);

  const SIDE_GAP_PX = 10;
  const WIDTH_CALC = `calc(100% - ${SIDE_GAP_PX * 2}px)`;
  const BOTTOM_GAP = 'calc(16px + env(safe-area-inset-bottom, 0px))';
  const KEYBOARD_GAP = '10px';

  const MOBILE_PROPS: Array<[string, string]> = [
    ['position', 'fixed'],
    ['bottom', BOTTOM_GAP],
    ['left', '50%'],
    ['right', 'auto'],
    ['top', 'auto'],
    ['transform', 'translateX(-50%)'],
    ['width', WIDTH_CALC],
    ['max-width', WIDTH_CALC],
    ['box-sizing', 'border-box'],
    ['margin', '0'],
    ['z-index', '100'],
    ['border-radius', '16px'],
    ['overflow', 'visible'],
    ['opacity', '1'],
    ['visibility', 'visible'],
    ['display', 'flex'],
    ['flex-direction', 'column'],
  ];

  const applyLayout = (): void => {
    if (mobileQuery.matches) {
      MOBILE_PROPS.forEach(([prop, val]) => {
        inputContainer.style.setProperty(prop, val, 'important');
      });
    } else {
      MOBILE_PROPS.forEach(([prop]) => {
        inputContainer.style.removeProperty(prop);
      });
    }
  };

  const onQueryChange = (): void => applyLayout();
  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', onQueryChange);
  } else {
    (mobileQuery as unknown as { addListener: (fn: () => void) => void }).addListener(onQueryChange);
  }

  window.addEventListener('resize', applyLayout);
  window.addEventListener('orientationchange', () => { setTimeout(applyLayout, 120); });

  if ('visualViewport' in window && window.visualViewport) {
    const vv = window.visualViewport;
    vv.addEventListener('resize', () => {
      if (!mobileQuery.matches) return;
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
      if (keyboardHeight > 100) {
        mainPanel?.classList.add('keyboard-open');
        inputContainer.style.setProperty('bottom', KEYBOARD_GAP, 'important');
      } else {
        mainPanel?.classList.remove('keyboard-open');
        inputContainer.style.setProperty('bottom', BOTTOM_GAP, 'important');
      }
      inputContainer.style.setProperty('left', '50%', 'important');
      inputContainer.style.setProperty('right', 'auto', 'important');
      inputContainer.style.setProperty('transform', 'translateX(-50%)', 'important');
      inputContainer.style.setProperty('width', WIDTH_CALC, 'important');
      inputContainer.style.setProperty('max-width', WIDTH_CALC, 'important');
      inputContainer.style.setProperty('overflow', 'visible', 'important');

      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages && keyboardHeight > 100) {
        setTimeout(() => {
          chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    });
  }

  applyLayout();
  setTimeout(applyLayout, 50);
  setTimeout(applyLayout, 300);
}

export function initializeInputUI(): void {
  console.log('⌨️ Input UI (Compact Dropdown · Reveal At Close-Button Spot · Zero Vibration)');

  const inputField = document.querySelector('.chat-input') as HTMLTextAreaElement | null;
  const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement | null;
  const plusBtn = document.querySelector('.plus-btn') as HTMLElement | null;
  const inputContainer = document.querySelector('.input-container') as HTMLElement | null;
  const actionsBar = document.querySelector('.input-actions') as HTMLElement | null;
  const mainPanel = document.getElementById('mainPanel');

  if (!inputField || !inputContainer || !actionsBar) return;

  setupResponsiveInput(inputContainer, inputField, mainPanel);

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

  let inputOpen = true;

  /* ───────────────────────────────────────────────────────────────────
     REVEAL — close button ki EXACT jagah pe
     Band ka centre = close button ka centre (same spot, no offset)
     Geometry hover pe never change → arrow zero vibration
     ─────────────────────────────────────────────────────────────────── */
  const REVEAL_H = 16;
  let revealCenterX = 0;
  let revealCenterY = 0;

  const placeRevealAt = (centerY: number, centerX: number): void => {
    revealCenterY = centerY;
    revealCenterX = centerX;
    const desiredTop = centerY - REVEAL_H / 2;
    const topValue =
      `max(2px, min(${desiredTop}px, calc(100% - ${REVEAL_H}px - env(safe-area-inset-bottom, 0px))))`;
    fixedReveal.style.setProperty('position', 'fixed', 'important');
    fixedReveal.style.setProperty('display', 'flex', 'important');
    fixedReveal.style.setProperty('height', `${REVEAL_H}px`, 'important');
    fixedReveal.style.setProperty('top', topValue, 'important');
    fixedReveal.style.setProperty('bottom', 'auto', 'important');
    fixedReveal.style.setProperty('left', `${centerX}px`, 'important');
    fixedReveal.style.setProperty('right', 'auto', 'important');
    fixedReveal.style.setProperty('transform', 'translateX(-50%)', 'important');
    fixedReveal.style.setProperty('overflow', 'visible', 'important');
  };

  const hideReveal = (): void => {
    fixedReveal.style.setProperty('display', 'none', 'important');
  };

  hideReveal();

  const forceOpenOnWelcome = (): void => {
    const panel = document.getElementById('mainPanel');
    if (panel && !panel.classList.contains('chat-active') && !inputOpen) {
      inputOpen = true;
      hideReveal();
      inputContainer.classList.remove('input-closed');
      setTimeout(() => { inputField.style.height = ''; inputField.style.minHeight = ''; inputField.style.maxHeight = ''; inputField.style.overflowY = ''; }, 50);
    }
  };

  document.addEventListener('asuum:welcome-mode', forceOpenOnWelcome);
  const panel = document.getElementById('mainPanel');
  if (panel) {
    new MutationObserver(() => {
      if (!panel.classList.contains('chat-active') && !inputOpen) forceOpenOnWelcome();
      if (dropdownOpen) applyDropdownPosition();
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  const toggleInput = (e?: Event): void => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    inputOpen = !inputOpen;
    closeDropdown();
    if (inputOpen) {
      hideReveal();
      inputContainer.classList.remove('input-closed');
      setTimeout(() => { inputField.focus(); inputField.style.height = ''; inputField.style.minHeight = ''; inputField.style.maxHeight = ''; inputField.style.overflowY = ''; }, 350);
    } else {
      /* Close button ka centre capture karo — reveal EXACTLY wahi banega */
      const r = closeBtn.getBoundingClientRect();
      placeRevealAt(r.top + r.height / 2, r.left + r.width / 2);
      inputContainer.classList.add('input-closed');
      inputField.blur();
    }
  };

  closeBtn.addEventListener('click', toggleInput);
  box.addEventListener('click', toggleInput);
  line.addEventListener('click', toggleInput);
  inputContainer.addEventListener('click', (e: MouseEvent) => { if (!inputOpen && e.target !== inputField) toggleInput(); });

  /* Resize / rotate pe reveal apni jagah pe recompute (band centre same) */
  const repositionRevealIfClosed = (): void => {
    if (inputOpen) return;
    const c = inputContainer.getBoundingClientRect();
    const btnH = closeBtn.offsetHeight || 20;
    placeRevealAt(c.bottom - btnH / 2, c.left + c.width / 2);
  };
  window.addEventListener('resize', repositionRevealIfClosed);
  window.addEventListener('orientationchange', () => { setTimeout(repositionRevealIfClosed, 150); });
  window.visualViewport?.addEventListener('resize', () => { setTimeout(repositionRevealIfClosed, 60); });

  const autoResize = (): void => {
    if (!inputOpen) return;
    if (inputField.value.trim() === '') { inputField.style.height = ''; inputField.style.overflowY = 'hidden'; if (sendBtn) sendBtn.disabled = true; return; }
    inputField.style.height = 'auto'; inputField.style.overflowY = 'hidden';
    const sh = inputField.scrollHeight;
    if (sh > MAX_HEIGHT) { inputField.style.height = MAX_HEIGHT + 'px'; inputField.style.overflowY = 'auto'; }
    else { inputField.style.height = sh + 'px'; inputField.style.overflowY = 'hidden'; }
    if (sendBtn) sendBtn.disabled = inputField.value.trim().length === 0;
    if (dropdownOpen) syncDropdownHeight();
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
  inputField.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); } });
  if (sendBtn) { sendBtn.addEventListener('click', sendMessage); sendBtn.disabled = true; }
  if (plusBtn) { plusBtn.addEventListener('click', () => { console.log('➕ Plus clicked'); }); }
  autoResize();
}