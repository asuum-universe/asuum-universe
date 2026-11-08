/**
 * ============================================
 * FILE: types.ts
 * RESPONSIBILITY: Shared Types (Global)
 * ============================================
 */

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
}

export interface AppState {
  currentChatId: string | null;
  chats: Chat[];
  isDarkMode: boolean;
}

// ✅ EVENT TYPES (INPUT_BOX_READY add kar diya hai)
export type EventType = 
  | 'WELCOME_SCREEN_READY'  
  | 'SIDEBAR_READY'         
  | 'INPUT_BOX_READY'       // <-- NAYA EVENT YAHAN ADD KIYA
  | 'NEW_MESSAGE'           
  | 'CHAT_SELECTED'         
  | 'CHAT_CREATED'          
  | 'CHAT_DELETED'          
  | 'THEME_CHANGED'         
  | 'SETTINGS_UPDATED';     

export interface EventPayload {
  type: EventType;
  data?: any;
}