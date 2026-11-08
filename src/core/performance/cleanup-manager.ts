/**
 * ============================================
 * FILE: cleanup-manager.ts
 * RESPONSIBILITY: Periodic memory cleanup
 * ============================================
 */

export class CleanupManager {
  private intervalId: number | null = null;
  private callbacks: Array<() => void> = [];

  /**
   * Start cleanup loop
   */
  start(intervalMs: number = 5000): void {
    if (this.intervalId) return;
    
    this.intervalId = window.setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  /**
   * Stop cleanup loop
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Register cleanup callback
   */
  onCleanup(callback: () => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Unregister cleanup callback
   */
  offCleanup(callback: () => void): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  /**
   * Run cleanup
   */
  private cleanup(): void {
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
  }
}