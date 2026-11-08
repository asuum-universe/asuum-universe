/**
 * ============================================
 * FILE: loading-manager.ts
 * RESPONSIBILITY: Core loading manager (singleton)
 * ============================================
 */

import { LoadingStrategies } from './loading-strategies';
import { LoadingQueue } from './loading-queue';
import {
  LoadingStrategy,
  LoadingOptions,
  LoadingState,
  LoadingTask,
  LoadingEvent,
} from './loading-types';

class LoadingManager {
  private static instance: LoadingManager;
  
  private queue: LoadingQueue;
  private state: LoadingState;
  private eventListeners: Map<LoadingEvent, Set<Function>> = new Map();

  private constructor() {
    this.queue = new LoadingQueue(3);
    this.state = {
      isLoading: false,
      activeTasks: new Map(),
      completedTasks: new Map(),
      failedTasks: new Map(),
      progress: 0,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LoadingManager {
    if (!LoadingManager.instance) {
      LoadingManager.instance = new LoadingManager();
    }
    return LoadingManager.instance;
  }

  /**
   * 🚀 Main load method — use this everywhere
   */
  async load<T>(
    name: string,
    task: () => Promise<T>,
    options: LoadingOptions = {}
  ): Promise<T> {
    const {
      strategy = 'smart',
      priority = 'normal',
      showUI = true,
      timeout = 30000,
      retryCount = 2,
      onComplete,
      onError,
    } = options;

    const taskId = `${name}-${Date.now()}`;

    // Create task
    const loadingTask: LoadingTask = {
      id: taskId,
      name,
      strategy,
      priority,
      execute: async () => {
        return this.executeWithRetry(task, retryCount, timeout);
      },
      onComplete: (result) => {
        this.handleComplete(taskId, result);
        if (onComplete) onComplete(result);
      },
      onError: (error) => {
        this.handleError(taskId, error);
        if (onError) onError(error);
      },
    };

    // Add to active tasks
    this.state.activeTasks.set(taskId, loadingTask);
    this.updateLoadingState();

    // Show UI if needed
    if (showUI) {
      this.emit('loading:start', { taskId, name, strategy });
    }

    // Add to queue
    this.queue.add(loadingTask);

    // Wait for completion
    return new Promise((resolve, reject) => {
      const checkCompletion = setInterval(() => {
        if (this.state.completedTasks.has(taskId)) {
          clearInterval(checkCompletion);
          resolve(this.state.completedTasks.get(taskId));
        } else if (this.state.failedTasks.has(taskId)) {
          clearInterval(checkCompletion);
          reject(this.state.failedTasks.get(taskId));
        }
      }, 50);
    });
  }

  /**
   * Execute task with retry logic
   */
  private async executeWithRetry<T>(
    task: () => Promise<T>,
    retryCount: number,
    timeout: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        // Add timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), timeout);
        });

        // Race between task and timeout
        const result = await Promise.race([task(), timeoutPromise]);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on last attempt
        if (attempt === retryCount) {
          throw lastError;
        }

        // Wait before retry (exponential backoff)
        await this.wait(Math.pow(2, attempt) * 1000);
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * Handle task completion
   */
  private handleComplete(taskId: string, result: any): void {
    this.state.activeTasks.delete(taskId);
    this.state.completedTasks.set(taskId, result);
    this.updateLoadingState();
    this.emit('loading:complete', { taskId, result });
  }

  /**
   * Handle task error
   */
  private handleError(taskId: string, error: Error): void {
    this.state.activeTasks.delete(taskId);
    this.state.failedTasks.set(taskId, error);
    this.updateLoadingState();
    this.emit('loading:error', { taskId, error });
  }

  /**
   * Update loading state
   */
  private updateLoadingState(): void {
    const wasLoading = this.state.isLoading;
    this.state.isLoading = this.state.activeTasks.size > 0;

    // Calculate progress
    const total = this.state.completedTasks.size + this.state.failedTasks.size + this.state.activeTasks.size;
    const completed = this.state.completedTasks.size;
    this.state.progress = total > 0 ? (completed / total) * 100 : 0;

    // Emit progress
    this.emit('loading:progress', { progress: this.state.progress });

    // Emit idle if done
    if (wasLoading && !this.state.isLoading) {
      this.emit('loading:idle', {});
    }
  }

  /**
   * Prefetch data (load in background)
   */
  async prefetch<T>(name: string, task: () => Promise<T>): Promise<void> {
    await LoadingStrategies.prefetch(async () => {
      const result = await task();
      this.state.completedTasks.set(`prefetch-${name}`, result);
      return result;
    });
  }

  /**
   * Get cached data (from prefetch)
   */
  getCached<T>(name: string): T | null {
    return this.state.completedTasks.get(`prefetch-${name}`) || null;
  }

  /**
   * Subscribe to loading events
   */
  on(event: LoadingEvent, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from loading events
   */
  off(event: LoadingEvent, callback: Function): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: LoadingEvent, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Get current state
   */
  getState(): LoadingState {
    return { ...this.state };
  }

  /**
   * Wait utility
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const LoadingManagerInstance = LoadingManager.getInstance();