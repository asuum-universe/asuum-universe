/**
 * ============================================
 * FILE: visibility-manager.ts
 * RESPONSIBILITY: Pause/resume when tab is hidden/visible
 * ============================================
 */

export class VisibilityManager {
  private isVisible = true;
  private callbacks: Array<(visible: boolean) => void> = [];

  /**
   * Start visibility monitoring
   */
  start(): void {
    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      
      // Apply to DOM
      const panel = document.getElementById('mainPanel');
      if (panel) {
        if (this.isVisible) {
          panel.classList.remove('animations-paused');
        } else {
          panel.classList.add('animations-paused');
        }
      }

      // Notify callbacks
      this.callbacks.forEach(callback => callback(this.isVisible));
    });
  }

  /**
   * Check if tab is visible
   */
  isTabVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Subscribe to visibility changes
   */
  onChange(callback: (visible: boolean) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Unsubscribe from visibility changes
   */
  offChange(callback: (visible: boolean) => void): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }
}