/**
 * ============================================
 * FILE: event-bus.ts
 * FEATURE: Event Bus (Global Communication)
 * RESPONSIBILITY: 
 *   - Features ke beech communication manage karna
 *   - Events ko broadcast karna (publish)
 *   - Events ko sunna (subscribe)
 *   - Loosely coupled architecture provide karna
 * 
 * HOW IT WORKS:
 *   1. Feature A: eventBus.emit('NEW_MESSAGE', messageData)
 *   2. Feature B: eventBus.on('NEW_MESSAGE', (data) => { ... })
 *   3. Feature B ko message mil jayega
 * 
 * USAGE:
 *   - import { eventBus } from '../event-bus';
 *   - eventBus.emit('CHAT_SELECTED', { chatId: '123' });
 *   - eventBus.on('CHAT_SELECTED', (data) => { console.log(data); });
 * 
 * AUTHOR: Asum Universe Team
 * CREATED: 2026-09-21
 * ============================================
 */

import { EventPayload, EventType } from './types';

// Event listener ka type
type EventListener = (data: any) => void;

// Event Bus class
class EventBus {
  private listeners: Map<EventType, EventListener[]> = new Map();

  // Event subscribe karna (sunna)
  on(eventType: EventType, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  // Event unsubscribe karna (sunna band karna)
  off(eventType: EventType, listener: EventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Event emit karna (broadcast karna)
  emit(eventType: EventType, data?: any): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  // Saare listeners clear karna (cleanup)
  clear(): void {
    this.listeners.clear();
  }
}

// Singleton instance - Poori app mein ek hi event bus use hoga
export const eventBus = new EventBus();