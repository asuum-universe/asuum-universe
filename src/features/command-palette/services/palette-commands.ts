/**
 * palette-commands.ts — STATIC COMMAND REGISTRY (V1 CLEAN)
 * ✅ Fixed: Added 'Tabs' to group union type
 * ✅ Removed 'Workspaces' (no longer used in V1)
 * ✅ Fixed: Removed static import of chat-rules-ui to resolve Vite warning
 */

import { startNewChat } from '../../chat-screen/services/chat-store';

/**
 * Lazy runtime reference for openRulesModal.
 * Avoids static import conflict with dynamic loading in app.ts.
 */
function lazyOpenRulesModal(): void {
  const overlay = document.getElementById('crOverlay');
  if (overlay) {
    overlay.classList.add('active');
    setTimeout(() => {
      const ta = document.getElementById('crTextarea') as HTMLTextAreaElement | null;
      ta?.focus();
    }, 400);
    return;
  }
  console.warn('⚠️ Chat Rules UI not loaded yet. Please wait.');
}

// ✅ FIXED: 'Tabs' added, 'Workspaces' removed
export interface Command {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
  group: 'Actions' | 'Chats' | 'Tabs';
  shortcut?: string;
  action: () => void;
}

/* ---- Icons ---- */
const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
const ICON_SIDEBAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M9 4v16"></path></svg>`;
const ICON_RULES = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
const ICON_HUB = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"></path><path d="M9 8V2"></path><path d="M15 8V2"></path><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"></path></svg>`;

function click(selector: string): void {
  (document.querySelector(selector) as HTMLElement | null)?.click();
}

function focusChatInput(): void {
  const input = document.querySelector('.chat-input') as HTMLTextAreaElement | null;
  if (input) input.focus();
}

export function getStaticCommands(): Command[] {
  return [
    {
      id: 'new-chat',
      label: 'New Chat',
      icon: ICON_CHAT,
      keywords: ['new', 'chat', 'start', 'fresh'],
      group: 'Actions',
      action: () => { startNewChat(); focusChatInput(); },
    },
    {
      id: 'new-tab',
      label: 'New Tab',
      icon: ICON_PLUS,
      keywords: ['new', 'tab', 'add'],
      group: 'Actions',
      action: () => click('.tab-add-btn'),
    },
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      icon: ICON_SIDEBAR,
      keywords: ['sidebar', 'panel', 'show', 'hide'],
      group: 'Actions',
      action: () => click('#sidebarToggle'),
    },
    {
      id: 'open-rules',
      label: 'Chat Rules',
      icon: ICON_RULES,
      keywords: ['rules', 'settings', 'instructions'],
      group: 'Actions',
      action: () => lazyOpenRulesModal(),
    },
    {
      id: 'open-hub',
      label: 'Model Hub',
      icon: ICON_HUB,
      keywords: ['model', 'hub', 'ai', 'provider', 'gemini', 'openai'],
      group: 'Actions',
      action: () => click('#modelHubBtn'),
    },
  ];
}