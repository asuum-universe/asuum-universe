/**
 * ============================================
 * FILE: quality-manager.ts
 * RESPONSIBILITY: Auto-adjust quality based on performance
 * ============================================
 */

import { QualityLevel, QualityConfig } from './performance-types';

const QUALITY_SETTINGS: Record<QualityLevel, QualityConfig> = {
  high: {
    blurLevel: 60,
    animationSpeed: 1,
    maxSplashes: 6,
    enableBreathing: true,
    enableTrails: true,
    cleanupInterval: 5000,
  },
  medium: {
    blurLevel: 50,
    animationSpeed: 1,
    maxSplashes: 4,
    enableBreathing: true,
    enableTrails: true,
    cleanupInterval: 5000,
  },
  low: {
    blurLevel: 30,
    animationSpeed: 0.7,
    maxSplashes: 3,
    enableBreathing: false,
    enableTrails: false,
    cleanupInterval: 8000,
  },
  minimal: {
    blurLevel: 20,
    animationSpeed: 0.5,
    maxSplashes: 2,
    enableBreathing: false,
    enableTrails: false,
    cleanupInterval: 10000,
  },
};

export class QualityManager {
  private currentQuality: QualityLevel = 'high';
  private callbacks: Array<(quality: QualityLevel, config: QualityConfig) => void> = [];

  /**
   * Get current quality level
   */
  getQuality(): QualityLevel {
    return this.currentQuality;
  }

  /**
   * Get current quality config
   */
  getConfig(): QualityConfig {
    return QUALITY_SETTINGS[this.currentQuality];
  }

  /**
   * Set quality level
   */
  setQuality(level: QualityLevel): void {
    if (this.currentQuality === level) return;
    
    this.currentQuality = level;
    const config = QUALITY_SETTINGS[level];
    
    // Apply to DOM
    this.applyToDOM(level, config);
    
    // Notify callbacks
    this.callbacks.forEach(callback => callback(level, config));
  }

  /**
   * Auto-adjust based on FPS and memory
   */
  autoAdjust(fps: number, memoryPercent: number): void {
    let newQuality: QualityLevel = this.currentQuality;

    // Critical performance
    if (fps < 25 || memoryPercent > 85) {
      newQuality = 'minimal';
    }
    // Warning performance
    else if (fps < 40 || memoryPercent > 70) {
      newQuality = 'low';
    }
    // Good performance
    else if (fps >= 55 && memoryPercent < 50) {
      newQuality = 'high';
    }
    // Medium performance
    else {
      newQuality = 'medium';
    }

    // Only change if different
    if (newQuality !== this.currentQuality) {
      console.log(`🎨 Quality adjusted: ${this.currentQuality} → ${newQuality} (FPS: ${fps}, Memory: ${memoryPercent.toFixed(1)}%)`);
      this.setQuality(newQuality);
    }
  }

  /**
   * Subscribe to quality changes
   */
  onChange(callback: (quality: QualityLevel, config: QualityConfig) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Unsubscribe from quality changes
   */
  offChange(callback: (quality: QualityLevel, config: QualityConfig) => void): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  /**
   * Apply quality settings to DOM
   */
  private applyToDOM(level: QualityLevel, config: QualityConfig): void {
    const panel = document.getElementById('mainPanel');
    if (!panel) return;

    // Set data attribute for CSS
    panel.dataset.quality = level;

    // Set CSS variables
    panel.style.setProperty('--blur-level', `${config.blurLevel}px`);
    panel.style.setProperty('--animation-speed', `${config.animationSpeed}`);
    panel.style.setProperty('--max-splashes', `${config.maxSplashes}`);
  }
}