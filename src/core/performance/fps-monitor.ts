/**
 * ============================================
 * FILE: fps-monitor.ts
 * RESPONSIBILITY: Real-time FPS monitoring
 * ============================================
 */

export class FPSMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private currentFPS = 60;
  private animationFrameId: number | null = null;
  private callbacks: Array<(fps: number) => void> = [];
  private isRunning = false;

  /**
   * Start FPS monitoring
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.measure();
  }

  /**
   * Stop FPS monitoring
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.currentFPS;
  }

  /**
   * Subscribe to FPS updates
   */
  onUpdate(callback: (fps: number) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Unsubscribe from FPS updates
   */
  offUpdate(callback: (fps: number) => void): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  /**
   * Measure FPS every second
   */
  private measure(): void {
    if (!this.isRunning) return;

    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastTime;

    // Calculate FPS every second
    if (elapsed >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = now;

      // Notify callbacks
      this.callbacks.forEach(callback => callback(this.currentFPS));
    }

    this.animationFrameId = requestAnimationFrame(() => this.measure());
  }
}