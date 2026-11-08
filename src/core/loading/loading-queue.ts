/**
 * ============================================
 * FILE: loading-queue.ts
 * RESPONSIBILITY: Queue system for managing multiple loads
 * ============================================
 */

import { LoadingTask, LoadingPriority } from './loading-types';

export class LoadingQueue {
  private queue: Map<string, LoadingTask> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrent: number = 3;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add task to queue
   */
  add(task: LoadingTask): void {
    this.queue.set(task.id, task);
    this.processQueue();
  }

  /**
   * Remove task from queue
   */
  remove(taskId: string): void {
    this.queue.delete(taskId);
    this.processing.delete(taskId);
  }

  /**
   * Process queue (priority-based)
   */
  private async processQueue(): Promise<void> {
    // Don't process if at max capacity
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    // Get next task by priority
    const nextTask = this.getNextTask();
    if (!nextTask) return;

    // Mark as processing
    this.processing.add(nextTask.id);
    this.queue.delete(nextTask.id);

    try {
      // Execute task
      const result = await nextTask.execute();
      
      // Call completion callback
      if (nextTask.onComplete) {
        nextTask.onComplete(result);
      }
    } catch (error) {
      // Call error callback
      if (nextTask.onError) {
        nextTask.onError(error as Error);
      }
    } finally {
      // Remove from processing
      this.processing.delete(nextTask.id);
      
      // Process next task
      this.processQueue();
    }
  }

  /**
   * Get next task based on priority
   */
  private getNextTask(): LoadingTask | null {
    if (this.queue.size === 0) return null;

    // Sort by priority
    const priorityOrder: LoadingPriority[] = ['critical', 'high', 'normal', 'low'];
    
    for (const priority of priorityOrder) {
      for (const [id, task] of this.queue.entries()) {
        if (task.priority === priority) {
          return task;
        }
      }
    }

    return null;
  }

  /**
   * Get queue status
   */
  getStatus(): {
    pending: number;
    processing: number;
    total: number;
  } {
    return {
      pending: this.queue.size,
      processing: this.processing.size,
      total: this.queue.size + this.processing.size,
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue.clear();
    this.processing.clear();
  }
}