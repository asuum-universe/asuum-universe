/**
 * ============================================
 * FILE: collaboration.ts
 * RESPONSIBILITY: Connect Sidebar with other features
 * ============================================
 */

import { eventBus } from '../../event-bus';

export function initializeSidebarCollaboration(): void {
  console.log('🔗 Sidebar Collaboration Initialized');

  // Listen for new chat creation
  eventBus.on('CHAT_CREATED', (data) => {
    console.log('📁 Sidebar received new chat:', data);
  });

  // Listen for chat selection
  eventBus.on('CHAT_SELECTED', (data) => {
    console.log('📁 Sidebar received chat selection:', data);
  });

  // Emit sidebar ready
  eventBus.emit('SIDEBAR_READY', {
    timestamp: Date.now(),
    status: 'loaded'
  });
}