/**
 * ============================================
 * FILE: chat-init.service.ts
 * RESPONSIBILITY: Chat Screen Background Services
 * ✅ UPDATED: Uses secure crypto store instead of old ai-gateway
 * ============================================
 */

import { getAllSavedProviders } from '../../../core/crypto';

export async function runChatInitServices(): Promise<void> {
  console.log('⚙️ Chat Screen Background Services Initialized');

  try {
    const savedProviders = await getAllSavedProviders();
    if (savedProviders.length > 0) {
      console.log(`✅ ${savedProviders.length} AI Provider(s) configured: ${savedProviders.join(', ')}`);
    } else {
      console.log('⚠️ No API keys saved yet. Open Settings to add your provider keys.');
    }
  } catch (e) {
    console.warn('⚠️ Could not read saved providers:', e);
  }
}