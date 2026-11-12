/** input-ui.ts — SMOOTH NO-FLICKER TREE SELECTOR + MOBILE KEYBOARD INTEGRATION */
import { eventBus } from '../../../event-bus';
import { getAllSavedProviders } from '../../../core/crypto';
import { fetchModelsForProvider } from '../../../core/ai-router';

const MAX_HEIGHT = 200;
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

export function getSelectedProvider(): string { return selectedProviderId; }
export function getSelectedModel(): string { return selectedModelId; }

export function initializeInputUI(): void {
  console.log('⌨️ Input UI (Smooth No-Flicker Selector + Mobile Keyboard Integration)');

  const inputField = document.querySelector('.chat-input') as HTMLTextAreaElement | null;
  const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement | null;
  const plusBtn = document.querySelector('.plus-btn') as HTMLElement | null;
  const inputContainer = document.querySelector('.input-container') as HTMLElement | null;
  const actionsBar = document.querySelector('.input-actions') as HTMLElement | null;
  const mainPanel = document.getElementById('mainPanel');

  if (!inputField || !inputContainer || !actionsBar) return;

  selectedProviderId = getStored('asuum_selected_provider', 'auto');
  selectedModelId = getStored('asuum_selected_model', 'auto');

  inputContainer.querySelectorAll('.input-close-btn, .input-reveal-zone, .provider-selector-wrap').forEach(el => el.remove());
  document.querySelectorAll('.input-fixed-reveal').forEach(el => el.remove());

  const selectorWrap = document.createElement('div');
  selectorWrap.className = 'provider-selector-wrap';

  const trigger = document.createElement('button');
  trigger.className = 'provider-trigger';
  trigger.title = 'Select Provider & Model';

  const dropdown = document.createElement('div');
  dropdown.className = 'provider-dropdown';

  function updateTriggerLabel(): void {
    let label = 'Auto';
    if (selectedProviderId !== 'auto') {
      label = selectedProviderId.charAt(0).toUpperCase() + selectedProviderId.slice(1);
      if (selectedModelId !== 'auto') {
        const short = selectedModelId.length > 18 ? selectedModelId.slice(0, 16) + '…' : selectedModelId;
        label += ' / ' + short;
      }
    }
    trigger.innerHTML = '<span class="provider-label">' + label + '</span>';
  }

  function isWelcomeMode(): boolean {
    const panel = document.getElementById('mainPanel');
    return !!panel && !panel.classList.contains('chat-active');
  }

  // ✅ Build dropdown content into a FRAGMENT first, then swap in one frame
  async function buildDropdownContent(): Promise<DocumentFragment> {
    const frag = document.createDocumentFragment();

    // Auto option
    const isAutoActive = selectedProviderId === 'auto' && selectedModelId === 'auto';
    const autoRow = document.createElement('button');
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
      provRow.className = 'tree-item tree-provider' + (isExpanded ? ' expanded' : '');
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
        });
      };
      frag.appendChild(provRow);

      if (isExpanded) {
        let models = cachedModelsMap[pid];
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
                });
              }
            });
          }
        } else {
          const isAutoModActive = selectedProviderId === pid && selectedModelId === 'auto';
          const autoModRow = document.createElement('button');
          autoModRow.className = 'tree-item tree-model' + (isAutoModActive ? ' active' : '');
          autoModRow.innerHTML = '<span class="tree-label">Auto Model</span>' + (isAutoModActive ? '<span class="tree-tick">' + ICON_TICK + '</span>' : '');
          autoModRow.onclick = (e) => { e.stopPropagation(); select(pid, 'auto'); };
          frag.appendChild(autoModRow);

          for (const mid of models) {
            const isActive = selectedProviderId === pid && selectedModelId === mid;

            const mSep = document.createElement('div');
            mSep.className = 'tree-sep tree-sep-model';
            frag.appendChild(mSep);

            const modRow = document.createElement('button');
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
  }

  function select(provId: string, modId: string): void {
    selectedProviderId = provId;
    selectedModelId = modId;
    save('asuum_selected_provider', provId);
    save('asuum_selected_model', modId);
    updateTriggerLabel();
    closeDropdown();
    document.dispatchEvent(new CustomEvent('asuum:provider-changed', { detail: { provider: provId, model: modId } }));
    console.log('🔄 Selected:', provId, '/', modId);
  }

  async function openDropdown(): Promise<void> {
    dropdownOpen = true;
    selectorWrap.classList.add('open');
    if (isWelcomeMode()) {
      dropdown.classList.add('pos-below');
      dropdown.classList.remove('pos-above');
    } else {
      dropdown.classList.add('pos-above');
      dropdown.classList.remove('pos-below');
    }
    await refreshDropdown();
  }

  function closeDropdown(): void {
    dropdownOpen = false;
    selectorWrap.classList.remove('open');
  }

  async function toggleDropdown(e?: Event): Promise<void> {
    if (e) e.stopPropagation();
    if (dropdownOpen) {
      closeDropdown();
    } else {
      await openDropdown();
    }
  }

  updateTriggerLabel();
  trigger.addEventListener('click', toggleDropdown);
  document.addEventListener('click', (e: MouseEvent) => {
    if (dropdownOpen && !selectorWrap.contains(e.target as Node)) closeDropdown();
  });
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && dropdownOpen) closeDropdown();
  });

  selectorWrap.appendChild(trigger);
  selectorWrap.appendChild(dropdown);
  actionsBar.insertBefore(selectorWrap, actionsBar.firstChild);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'input-close-btn';
  closeBtn.title = 'Minimize input';
  closeBtn.innerHTML = ICON_MINIMIZE;
  inputContainer.appendChild(closeBtn);

  const fixedReveal = document.createElement('div');
  fixedReveal.className = 'input-fixed-reveal';
  fixedReveal.style.display = 'none';
  const line = document.createElement('div');
  line.className = 'input-reveal-line';
  const box = document.createElement('button');
  box.className = 'input-reveal-box';
  box.title = 'Open input';
  box.innerHTML = ICON_EXPAND;
  line.appendChild(box);
  fixedReveal.appendChild(line);
  document.body.appendChild(fixedReveal);

  let inputOpen = true;

  const forceOpenOnWelcome = (): void => {
    const panel = document.getElementById('mainPanel');
    if (panel && !panel.classList.contains('chat-active') && !inputOpen) {
      inputOpen = true;
      fixedReveal.style.display = 'none';
      inputContainer.classList.remove('input-closed');
      setTimeout(() => { inputField.style.height = ''; inputField.style.minHeight = ''; inputField.style.maxHeight = ''; inputField.style.overflowY = ''; }, 50);
    }
  };

  document.addEventListener('asuum:welcome-mode', forceOpenOnWelcome);
  const panel = document.getElementById('mainPanel');
  if (panel) {
    new MutationObserver(() => { if (!panel.classList.contains('chat-active') && !inputOpen) forceOpenOnWelcome(); }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  const toggleInput = (e?: Event): void => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    inputOpen = !inputOpen;
    closeDropdown();
    if (inputOpen) {
      fixedReveal.style.display = 'none';
      inputContainer.classList.remove('input-closed');
      setTimeout(() => { inputField.focus(); inputField.style.height = ''; inputField.style.minHeight = ''; inputField.style.maxHeight = ''; inputField.style.overflowY = ''; }, 350);
    } else {
      const r = closeBtn.getBoundingClientRect();
      fixedReveal.style.display = 'flex';
      fixedReveal.style.position = 'fixed';
      fixedReveal.style.left = (r.left + r.width / 2) + 'px';
      fixedReveal.style.top = (r.bottom - 18) + 'px';
      fixedReveal.style.transform = 'translateX(-50%)';
      inputContainer.classList.add('input-closed');
      inputField.blur();
    }
  };

  closeBtn.addEventListener('click', toggleInput);
  box.addEventListener('click', toggleInput);
  line.addEventListener('click', toggleInput);
  inputContainer.addEventListener('click', (e: MouseEvent) => { if (!inputOpen && e.target !== inputField) toggleInput(); });

  const autoResize = (): void => {
    if (!inputOpen) return;
    if (inputField.value.trim() === '') { inputField.style.height = ''; inputField.style.overflowY = 'hidden'; if (sendBtn) sendBtn.disabled = true; return; }
    inputField.style.height = 'auto'; inputField.style.overflowY = 'hidden';
    const sh = inputField.scrollHeight;
    if (sh > MAX_HEIGHT) { inputField.style.height = MAX_HEIGHT + 'px'; inputField.style.overflowY = 'auto'; }
    else { inputField.style.height = sh + 'px'; inputField.style.overflowY = 'hidden'; }
    if (sendBtn) sendBtn.disabled = inputField.value.trim().length === 0;
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

  /* ─────────────────────────────────────────────────────────────────────
     ✅ MOBILE KEYBOARD INTEGRATION
     · visualViewport API detects keyboard open/close
     · Adds .keyboard-open class to mainPanel
     · Smoothly scrolls to bottom when keyboard appears
     · Creates seamless "keyboard-attached" feel
     ───────────────────────────────────────────────────────────────────── */
  const isMobileDevice = window.innerWidth <= 768;
  if (isMobileDevice && 'visualViewport' in window && mainPanel) {
    let lastViewportHeight = window.visualViewport!.height;

    const onViewportResize = (): void => {
      const currentHeight = window.visualViewport!.height;
      const keyboardJustOpened = currentHeight < lastViewportHeight - 100;
      const keyboardJustClosed = currentHeight > lastViewportHeight + 100;

      if (keyboardJustOpened) {
        mainPanel.classList.add('keyboard-open');
        // Smooth scroll to bottom so last message is visible
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
          setTimeout(() => {
            chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
          }, 150);
        }
      } else if (keyboardJustClosed) {
        mainPanel.classList.remove('keyboard-open');
      }

      lastViewportHeight = currentHeight;
    };

    window.visualViewport!.addEventListener('resize', onViewportResize);

    inputField.addEventListener('focus', () => {
      setTimeout(() => {
        if (mainPanel) mainPanel.classList.add('keyboard-open');
      }, 300);
    });

    inputField.addEventListener('blur', () => {
      setTimeout(() => {
        if (mainPanel) mainPanel.classList.remove('keyboard-open');
      }, 150);
    });
  }
}