/**
 * ============================================
 * FILE: performance-types.ts
 * RESPONSIBILITY: Type definitions for performance system
 * ============================================
 */

export type PerformanceLevel = 'high' | 'medium' | 'low';
export type QualityLevel = 'high' | 'medium' | 'low' | 'minimal';

export interface PerformanceMetrics {
  fps: number;
  memoryUsed: number;
  memoryTotal: number;
  memoryPercent: number;
  deviceLevel: PerformanceLevel;
  qualityLevel: QualityLevel;
  isTabVisible: boolean;
}

export interface PerformanceConfig {
  fpsThreshold: {
    critical: number;  // Below this = critical lag
    warning: number;   // Below this = warning
  };
  memoryThreshold: {
    critical: number;  // Above this = critical
    warning: number;   // Above this = warning
  };
  qualitySettings: {
    high: QualityConfig;
    medium: QualityConfig;
    low: QualityConfig;
    minimal: QualityConfig;
  };
}

export interface QualityConfig {
  blurLevel: number;        // px
  animationSpeed: number;   // multiplier (1 = normal, 0.5 = slow)
  maxSplashes: number;      // watercolor limit
  enableBreathing: boolean; // breathing animations
  enableTrails: boolean;    // trail effects
  cleanupInterval: number;  // ms
}

export type PerformanceEvent = 
  | 'performance:critical'
  | 'performance:warning'
  | 'performance:good'
  | 'quality:changed'
  | 'visibility:changed';