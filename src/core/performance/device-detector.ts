/**
 * ============================================
 * FILE: device-detector.ts
 * RESPONSIBILITY: Detect device performance level
 * ============================================
 */

import { PerformanceLevel } from './performance-types';

export class DeviceDetector {
  /**
   * Detect device performance level
   */
  static detect(): PerformanceLevel {
    try {
      const memory = (navigator as any).deviceMemory;
      const cores = navigator.hardwareConcurrency;

      // Low-end: < 2GB RAM and < 2 cores
      if (memory && memory < 2 && cores && cores < 2) {
        return 'low';
      }

      // High-end: 8+ cores and 8+ GB RAM
      if (cores && cores >= 8 && (!memory || memory >= 8)) {
        return 'high';
      }

      // Medium: everything else
      return 'medium';
    } catch (e) {
      return 'medium';
    }
  }

  /**
   * Get device info
   */
  static getDeviceInfo(): {
    level: PerformanceLevel;
    cores: number;
    memory: number | null;
    isMobile: boolean;
  } {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory || null;
    const isMobile = window.innerWidth < 768;

    return {
      level: this.detect(),
      cores,
      memory,
      isMobile,
    };
  }
}