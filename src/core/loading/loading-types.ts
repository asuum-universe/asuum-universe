/**
 * ============================================
 * FILE: loading-types.ts
 * RESPONSIBILITY: Type definitions for loading system
 * ============================================
 */

export type LoadingStrategy = 
  | 'lazy'        // Background, low priority
  | 'fast'        // Immediate, high priority
  | 'smart'       // AI-based decision
  | 'skeleton'    // Placeholder UI
  | 'progressive' // Load in chunks
  | 'prefetch'    // Preload before needed
  | 'idle';       // Load when browser is idle

export type LoadingPriority = 'low' | 'normal' | 'high' | 'critical';

export interface LoadingTask {
  id: string;
  name: string;
  strategy: LoadingStrategy;
  priority: LoadingPriority;
  execute: () => Promise<any>;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  metadata?: Record<string, any>;
}

export interface LoadingState {
  isLoading: boolean;
  activeTasks: Map<string, LoadingTask>;
  completedTasks: Map<string, any>;
  failedTasks: Map<string, Error>;
  progress: number; // 0-100
}

export interface LoadingOptions {
  strategy?: LoadingStrategy;
  priority?: LoadingPriority;
  showUI?: boolean;
  timeout?: number;
  retryCount?: number;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export type LoadingEvent = 
  | 'loading:start'
  | 'loading:progress'
  | 'loading:complete'
  | 'loading:error'
  | 'loading:idle';