/**
 * ============================================
 * FILE: collaboration.ts
 * RESPONSIBILITY: Chat Rules Cross-Feature Sync (eventBus-free)
 * NOTE: Direct function calls — koi typed event error nahi
 * ============================================
 */

import { hasActiveRules } from './services/chat-rules-store';
import { refreshRulesDot } from './chat-rules-ts/chat-rules-ui';

/** App init par call hota hai — menu dot ko current state se sync karo */
export function initializeChatRulesCollaboration(): void {
  refreshRulesDot();
  console.log('🔗 Chat Rules Collaboration Initialized');
}

/**
 * Jab bhi rules save/clear hon, yeh call hota hai.
 * Direct dot refresh karta hai — event bus ki zaroorat nahi.
 */
export function notifyRulesChanged(): void {
  refreshRulesDot();
  console.log('📜 Rules changed → menu dot synced');
}

/** Helper — koi bhi feature check kar sakta hai rules active hain ya nahi */
export function areRulesActive(): boolean {
  return hasActiveRules();
}