/**
 * ============================================
 * FILE: loading-strategies.ts — FIXED
 * RESPONSIBILITY: Different loading strategies
 * ✅ ALL TypeScript errors fixed
 * ============================================
 */

import { LoadingStrategy } from './loading-types';

export class LoadingStrategies {
  
  /**
   * 🦥 LAZY — Background loading, low priority
   */
  static async lazy<T>(task: () => Promise<T>): Promise<T> {
    await this.waitForIdle();
    return task();
  }

  /**
   * ⚡ FAST — Immediate, high priority
   */
  static async fast<T>(task: () => Promise<T>): Promise<T> {
    return Promise.resolve(task());
  }

  /**
   * 🧠 SMART — AI-based decision
   */
  static async smart<T>(
    task: () => Promise<T>,
    context: {
      isUserAction?: boolean;
      isCritical?: boolean;
      networkSpeed?: 'slow' | 'normal' | 'fast';
      devicePerformance?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<T> {
    const { isUserAction, isCritical, networkSpeed, devicePerformance } = context;

    if (isUserAction && isCritical) {
      return this.fast(task);
    }

    if (networkSpeed === 'slow') {
      return this.lazy(task);
    }

    if (devicePerformance === 'low') {
      return this.idle(task);
    }

    return this.fast(task);
  }

  /**
   * 💀 SKELETON — Show placeholder while loading
   */
  static async skeleton<T>(
    task: () => Promise<T>,
    skeletonElement?: HTMLElement
  ): Promise<T> {
    if (skeletonElement) {
      skeletonElement.style.display = 'block';
    }

    try {
      const result = await task();
      return result;
    } finally {
      if (skeletonElement) {
        skeletonElement.style.display = 'none';
      }
    }
  }

  /**
   * 📦 PROGRESSIVE — Load in chunks
   * ✅ FIXED: Separate method, not called from execute
   */
  static async progressive<T>(
    task: (chunk: number) => Promise<T[]>,
    totalChunks: number = 3,
    onChunkLoaded?: (chunk: T[], chunkIndex: number) => void
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const chunk = await task(i);
      results.push(...chunk);
      
      if (onChunkLoaded) {
        onChunkLoaded(chunk, i);
      }

      await this.wait(50);
    }

    return results;
  }

  /**
   * 🔮 PREFETCH — Load before user needs it
   */
  static async prefetch<T>(task: () => Promise<T>): Promise<T | null> {
    if (await this.isBrowserIdle()) {
      try {
        return await task();
      } catch (error) {
        console.warn('Prefetch failed:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * 😴 IDLE — Load when browser is completely free
   */
  static async idle<T>(task: () => Promise<T>): Promise<T> {
    if ('requestIdleCallback' in window) {
      return new Promise((resolve) => {
        (window as any).requestIdleCallback(async () => {
          resolve(await task());
        });
      });
    } else {
      await this.wait(100);
      return task();
    }
  }

  /**
   * ✅ FIXED: Execute task based on strategy
   * Progressive ko separately call karo, execute se nahi
   */
  static async execute<T>(
    strategy: LoadingStrategy,
    task: () => Promise<T>,
    options: any = {}
  ): Promise<T> {
    switch (strategy) {
      case 'lazy':
        return this.lazy(task);
      case 'fast':
        return this.fast(task);
      case 'smart':
        return this.smart(task, options.context);
      case 'skeleton':
        return this.skeleton(task, options.skeletonElement);
      case 'prefetch':
        const result = await this.prefetch(task);
        return result as T;
      case 'idle':
        return this.idle(task);
      // ✅ Progressive removed from execute - call it directly
      // case 'progressive':
      //   Use: LoadingStrategies.progressive() directly
      default:
        return this.fast(task);
    }
  }

  private static waitForIdle(): Promise<void> {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => resolve());
      } else {
        setTimeout(resolve, 100);
      }
    });
  }

  private static async isBrowserIdle(): Promise<boolean> {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback((deadline: any) => {
          resolve(deadline.timeRemaining() > 10);
        });
      } else {
        resolve(true);
      }
    });
  }

  private static wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}