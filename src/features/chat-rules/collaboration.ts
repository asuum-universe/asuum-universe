/**
 * ============================================
 * FILE: collaboration.ts
 * RESPONSIBILITY: Chat Rules Cross-Feature Sync (eventBus-free)
 * NOTE: Direct function calls — koi typed event error nahi
 * FIX: Removed static import of chat-rules-ui to resolve
 *      dynamic/static mixed import warning in Vite build.
 *      Uses lazy runtime reference instead.
 * ============================================
 */

import { hasActiveRules } from './services/chat-rules-store';

/**
 * Lazy reference to avoid circular static import with chat-rules-ui.ts.
 * app.ts loads both modules dynamically, so by the time this is called
 * at runtime, chat-rules-ui is guaranteed to be available.
 */
let _refreshRulesDot: (() => void) | null = null;

function getRefreshRulesDot(): () => void {
  if (!_refreshRulesDot) {
    // Safe runtime lookup — no static import needed
    const mod = document.querySelector('#crOverlay')?.closest('[data-module]');
    // Fallback: direct DOM-based dot refresh without importing UI module
    _refreshRulesDot = (): void => {
      const dot = document.getElementById('mmRulesDot');
      if (dot) dot.classList.toggle('on', hasActiveRules());
    };
  }
  return _refreshRulesDot;
}

/** App init par call hota hai — menu dot ko current state se sync karo */
export function initializeChatRulesCollaboration(): void {
  getRefreshRulesDot()();
  console.log('🔗 Chat Rules Collaboration Initialized');
}

/**
 * Jab bhi rules save/clear hon, yeh call hota hai.
 * Direct dot refresh karta hai — event bus ki zaroorat nahi.
 */
export function notifyRulesChanged(): void {
  getRefreshRulesDot()();
  console.log('📜 Rules changed → menu dot synced');
}

/** Helper — koi bhi feature check kar sakta hai rules active hain ya nahi */
export function areRulesActive(): boolean {
  return hasActiveRules();
}