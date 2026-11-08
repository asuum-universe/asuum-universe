/**
 * ============================================
 * FILE: chat-rules-init.service.ts
 * RESPONSIBILITY: Chat Rules Background Services
 * ============================================
 */

import { hasActiveRules } from './chat-rules-store';

export async function runChatRulesInitServices(): Promise<void> {
  console.log('📜 Chat Rules Background Services Initialized');
  const active = hasActiveRules();
  if (active) {
    console.log('✨ Chat rules are active — will be applied to all AI replies');
  } else {
    console.log('📝 No chat rules set yet');
  }
}