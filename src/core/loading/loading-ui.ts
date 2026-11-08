/**
 * ============================================
 * FILE: loading-ui.ts
 * RESPONSIBILITY: Subtle visual indicators
 * ============================================
 */

export class LoadingUI {
  private static container: HTMLElement | null = null;
  private static progressBar: HTMLElement | null = null;

  /**
   * Initialize loading UI
   */
  static initialize(): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.className = 'loading-ui';
    this.container.innerHTML = `
      <div class="loading-progress-bar">
        <div class="loading-progress-fill"></div>
      </div>
      <div class="loading-indicator">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>
    `;
    document.body.appendChild(this.container);

    this.progressBar = this.container.querySelector('.loading-progress-fill');
  }

  /**
   * Show loading indicator
   */
  static show(): void {
    if (!this.container) this.initialize();
    this.container?.classList.add('visible');
  }

  /**
   * Hide loading indicator
   */
  static hide(): void {
    this.container?.classList.remove('visible');
  }

  /**
   * Update progress
   */
  static setProgress(percent: number): void {
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }
  }

  /**
   * Show skeleton placeholder
   */
  static showSkeleton(element: HTMLElement): void {
    element.classList.add('skeleton-loading');
  }

  /**
   * Hide skeleton placeholder
   */
  static hideSkeleton(element: HTMLElement): void {
    element.classList.remove('skeleton-loading');
  }
}