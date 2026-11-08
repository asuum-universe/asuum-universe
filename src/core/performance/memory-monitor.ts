/**
 * ============================================
 * FILE: memory-monitor.ts
 * RESPONSIBILITY: Memory usage monitoring (Chrome only)
 * ============================================
 */

export class MemoryMonitor {
  private currentUsage = 0;
  private totalMemory = 0;
  private intervalId: number | null = null;
  private callbacks: Array<(used: number, total: number, percent: number) => void> = [];
  private isRunning = false;

  /**
   * Start memory monitoring
   */
  start(intervalMs: number = 5000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.measure();
    this.intervalId = window.setInterval(() => this.measure(), intervalMs);
  }

  /**
   * Stop memory monitoring
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): { used: number; total: number; percent: number } {
    return {
      used: this.currentUsage,
      total: this.totalMemory,
      percent: this.totalMemory > 0 ? (this.currentUsage / this.totalMemory) * 100 : 0,
    };
  }

  /**
   * Subscribe to memory updates
   */
  onUpdate(callback: (used: number, total: number, percent: number) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Unsubscribe from memory updates
   */
  offUpdate(callback: (used: number, total: number, percent: number) => void): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  /**
   * Measure memory usage (Chrome only)
   */
  private measure(): void {
    if (!this.isRunning) return;

    // Check if performance.memory is available (Chrome only)
    const perf = performance as any;
    if (perf.memory) {
      this.currentUsage = perf.memory.usedJSHeapSize / (1024 * 1024); // MB
      this.totalMemory = perf.memory.totalJSHeapSize / (1024 * 1024); // MB
      const percent = (this.currentUsage / this.totalMemory) * 100;

      // Notify callbacks
      this.callbacks.forEach(callback => callback(this.currentUsage, this.totalMemory, percent));
    }
  }
}