import { describe, it, expect } from 'vitest';
import { FrameRateMonitor, getAdaptivePerformanceConfig } from './PerformanceOptimizer';

describe('PerformanceOptimizer', () => {
  describe('FrameRateMonitor', () => {
    it('should calculate FPS correctly', () => {
      const monitor = new FrameRateMonitor();

      // Record frames quickly to simulate high FPS
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame();
      }

      const fps = monitor.getFPS();
      expect(fps).toBeGreaterThan(0);
    });

    it('should determine performance level correctly', () => {
      const monitor = new FrameRateMonitor();

      // Record frames quickly to simulate high performance
      for (let i = 0; i < 60; i++) {
        monitor.recordFrame();
      }
      expect(monitor.getPerformanceLevel()).toBe('high');
    });
  });

  describe('Adaptive Performance Config', () => {
    it('should downgrade config when FPS is low', () => {
      const currentConfig = {
        enableSampling: false,
        samplingStrategy: 'importance',
        maxNodes: 1000,
        maxLinks: 5000,
        enableLod: false,
        lodThresholds: {
          highDetail: 300,
          mediumDetail: 600,
          lowDetail: 900
        }
      };

      const newConfig = getAdaptivePerformanceConfig(currentConfig, 20, 100); // Low FPS

      expect(newConfig.enableSampling).toBe(true);
      expect(newConfig.maxNodes).toBeLessThan(1000);
      expect(newConfig.enableLod).toBe(true);
    });

    it('should downgrade config when memory usage is high', () => {
      const currentConfig = {
        enableSampling: false,
        samplingStrategy: 'importance',
        maxNodes: 1000,
        maxLinks: 5000,
        enableLod: true,
        lodThresholds: {
          highDetail: 300,
          mediumDetail: 600,
          lowDetail: 900
        }
      };

      const newConfig = getAdaptivePerformanceConfig(currentConfig, 60, 500); // High memory

      expect(newConfig.enableSampling).toBe(true);
      expect(newConfig.maxNodes).toBeLessThan(1000);
      expect(newConfig.maxLinks).toBeLessThan(5000);
    });

    it('should maintain high config when performance is good', () => {
      const currentConfig = {
        enableSampling: false,
        samplingStrategy: 'importance',
        maxNodes: 1000,
        maxLinks: 5000,
        enableLod: true,
        lodThresholds: {
          highDetail: 300,
          mediumDetail: 600,
          lowDetail: 900
        }
      };

      const newConfig = getAdaptivePerformanceConfig(currentConfig, 60, 100); // Good performance

      expect(newConfig.enableSampling).toBe(false);
      expect(newConfig.maxNodes).toBe(1000);
      expect(newConfig.maxLinks).toBe(5000);
    });
  });
});