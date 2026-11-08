/**
 * ============================================
 * FILE: performance-monitor.ts
 * RESPONSIBILITY: Main performance monitor (singleton)
 * Connects all sub-monitors and manages optimization
 * ============================================
 */

import { FPSMonitor } from './fps-monitor';
import { MemoryMonitor } from './memory-monitor';
import { DeviceDetector } from './device-detector';
import { QualityManager } from './quality-manager';
import { VisibilityManager } from './visibility-manager';
import { CleanupManager } from './cleanup-manager';
import { PerformanceMetrics, PerformanceLevel } from './performance-types';

class PerformanceMonitor {
  private static instance: PerformanceMonitor;

  private fpsMonitor: FPSMonitor;
  private memoryMonitor: MemoryMonitor;
  private qualityManager: QualityManager;
  private visibilityManager: VisibilityManager;
  private cleanupManager: CleanupManager;

  private deviceLevel: PerformanceLevel;
  private currentFPS = 60;
  private currentMemoryPercent = 0;

  private constructor() {
    this.fpsMonitor = new FPSMonitor();
    this.memoryMonitor = new MemoryMonitor();
    this.qualityManager = new QualityManager();
    this.visibilityManager = new VisibilityManager();
    this.cleanupManager = new CleanupManager();

    this.deviceLevel = DeviceDetector.detect();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    console.log(`🚀 Performance Monitor Initialized (Device: ${this.deviceLevel})`);

    // Set initial quality based on device
    const initialQuality = this.deviceLevel === 'low' ? 'low' : 
                           this.deviceLevel === 'medium' ? 'medium' : 'high';
    this.qualityManager.setQuality(initialQuality);

    // Start monitors
    this.fpsMonitor.start();
    this.memoryMonitor.start(5000); // Check every 5s
    this.visibilityManager.start();
    this.cleanupManager.start(5000); // Cleanup every 5s

    // Subscribe to FPS updates
    this.fpsMonitor.onUpdate((fps) => {
      this.currentFPS = fps;
      this.autoOptimize();
    });

    // Subscribe to memory updates
    this.memoryMonitor.onUpdate((used, total, percent) => {
      this.currentMemoryPercent = percent;
      this.autoOptimize();
    });

    // Subscribe to visibility changes
    this.visibilityManager.onChange((visible) => {
      if (!visible) {
        // Tab hidden — pause everything
        this.fpsMonitor.stop();
        this.memoryMonitor.stop();
      } else {
        // Tab visible — resume
        this.fpsMonitor.start();
        this.memoryMonitor.start(5000);
      }
    });
  }

  /**
   * Auto-optimize based on performance
   */
  private autoOptimize(): void {
    // Only optimize if tab is visible
    if (!this.visibilityManager.isTabVisible()) return;

    // Auto-adjust quality
    this.qualityManager.autoAdjust(this.currentFPS, this.currentMemoryPercent);
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    const memory = this.memoryMonitor.getMemoryUsage();
    
    return {
      fps: this.currentFPS,
      memoryUsed: memory.used,
      memoryTotal: memory.total,
      memoryPercent: memory.percent,
      deviceLevel: this.deviceLevel,
      qualityLevel: this.qualityManager.getQuality(),
      isTabVisible: this.visibilityManager.isTabVisible(),
    };
  }

  /**
   * Get quality manager
   */
  getQualityManager(): QualityManager {
    return this.qualityManager;
  }

  /**
   * Get cleanup manager
   */
  getCleanupManager(): CleanupManager {
    return this.cleanupManager;
  }

  /**
   * Get visibility manager
   */
  getVisibilityManager(): VisibilityManager {
    return this.visibilityManager;
  }
}

// Export singleton instance
export const PerformanceMonitorInstance = PerformanceMonitor.getInstance();