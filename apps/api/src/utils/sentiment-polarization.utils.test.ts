/**
 * 情感极化指数计算工具函数单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSentimentPolarization,
  getPolarizationLevel,
  getPolarizationColor,
  type SentimentPolarizationResult,
} from './sentiment-polarization.utils';

describe('SentimentPolarizationUtils', () => {
  describe('calculateSentimentPolarization', () => {
    it('应该处理空数据（总数为0）', () => {
      const result = calculateSentimentPolarization(0, 0, 0);

      expect(result).toEqual({
        polarizationIndex: 0,
        bimodalityCoefficient: 0,
        extremeRatio: 0,
        neutralRatio: 0,
        sentimentVariance: 0,
        sentimentStdDev: 0,
        distribution: {
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
        },
      });
    });

    it('应该计算完全极化的情况（仅正负情感，无中性）', () => {
      const result = calculateSentimentPolarization(50, 50, 0);

      expect(result.polarizationIndex).toBeCloseTo(1, 4);
      expect(result.extremeRatio).toBeCloseTo(1, 4);
      expect(result.neutralRatio).toBeCloseTo(0, 4);
      expect(result.distribution.total).toBe(100);
    });

    it('应该计算完全不极化的情况（全为中性）', () => {
      const result = calculateSentimentPolarization(0, 0, 100);

      expect(result.polarizationIndex).toBeCloseTo(0, 4);
      expect(result.extremeRatio).toBeCloseTo(0, 4);
      expect(result.neutralRatio).toBeCloseTo(1, 4);
      expect(result.distribution.total).toBe(100);
    });

    it('应该计算轻度极化的情况（中性占主导）', () => {
      const result = calculateSentimentPolarization(20, 20, 60);

      // 极化指数应该较低
      expect(result.polarizationIndex).toBeGreaterThan(0);
      expect(result.polarizationIndex).toBeLessThan(0.5);
      expect(result.neutralRatio).toBeCloseTo(0.6, 4);
      expect(result.extremeRatio).toBeCloseTo(0.4, 4);
    });

    it('应该计算中度极化的情况（正负平衡，中性较少）', () => {
      const result = calculateSentimentPolarization(40, 40, 20);

      // 极化指数应该较高
      expect(result.polarizationIndex).toBeGreaterThan(0.5);
      expect(result.neutralRatio).toBeCloseTo(0.2, 4);
      expect(result.extremeRatio).toBeCloseTo(0.8, 4);
    });

    it('应该计算不平衡的极化（正面远多于负面）', () => {
      const result = calculateSentimentPolarization(80, 10, 10);

      expect(result.distribution.positive).toBe(80);
      expect(result.distribution.negative).toBe(10);
      expect(result.distribution.neutral).toBe(10);
      expect(result.polarizationIndex).toBeGreaterThan(0);
    });

    it('应该正确计算情感方差', () => {
      const result = calculateSentimentPolarization(50, 50, 0);

      // 当正负情感相等时，均值为0，方差应该为1
      expect(result.sentimentVariance).toBeCloseTo(1, 4);
      expect(result.sentimentStdDev).toBeCloseTo(1, 4);
    });

    it('应该正确计算双峰系数', () => {
      const result1 = calculateSentimentPolarization(50, 50, 0);
      const result2 = calculateSentimentPolarization(100, 0, 0);

      // 双峰系数在正负平衡时应该更高
      expect(result1.bimodalityCoefficient).toBeGreaterThan(0);
      expect(result2.bimodalityCoefficient).toBeGreaterThan(0);
    });

    it('应该正确返回分布数据', () => {
      const result = calculateSentimentPolarization(30, 40, 30);

      expect(result.distribution.positive).toBe(30);
      expect(result.distribution.negative).toBe(40);
      expect(result.distribution.neutral).toBe(30);
      expect(result.distribution.total).toBe(100);
    });

    it('极化指数应该在0-1范围内', () => {
      const testCases = [
        [0, 0, 1],
        [1, 0, 0],
        [0, 1, 0],
        [1, 1, 1],
        [100, 50, 25],
        [10, 90, 0],
        [33, 33, 34],
      ];

      testCases.forEach(([pos, neg, neu]) => {
        const result = calculateSentimentPolarization(pos, neg, neu);
        expect(result.polarizationIndex).toBeGreaterThanOrEqual(0);
        expect(result.polarizationIndex).toBeLessThanOrEqual(1);
      });
    });

    it('极端情感占比应该等于正负面比例之和', () => {
      const result = calculateSentimentPolarization(30, 40, 30);

      expect(result.extremeRatio).toBeCloseTo(
        result.distribution.positive / result.distribution.total +
          result.distribution.negative / result.distribution.total,
        4
      );
    });

    it('情感标准差应该等于方差的平方根', () => {
      const result = calculateSentimentPolarization(30, 40, 30);

      expect(result.sentimentStdDev).toBeCloseTo(
        Math.sqrt(result.sentimentVariance),
        4
      );
    });
  });

  describe('getPolarizationLevel', () => {
    it('应该返回正确的极化等级', () => {
      expect(getPolarizationLevel(0.9)).toBe('严重极化');
      expect(getPolarizationLevel(0.7)).toBe('高度极化');
      expect(getPolarizationLevel(0.5)).toBe('中度极化');
      expect(getPolarizationLevel(0.3)).toBe('轻度极化');
      expect(getPolarizationLevel(0.1)).toBe('无明显极化');
    });

    it('应该处理边界值', () => {
      expect(getPolarizationLevel(1.0)).toBe('严重极化');
      expect(getPolarizationLevel(0.8)).toBe('严重极化');
      expect(getPolarizationLevel(0.6)).toBe('高度极化');
      expect(getPolarizationLevel(0.4)).toBe('中度极化');
      expect(getPolarizationLevel(0.2)).toBe('轻度极化');
      expect(getPolarizationLevel(0.0)).toBe('无明显极化');
    });
  });

  describe('getPolarizationColor', () => {
    it('应该返回正确的颜色值', () => {
      expect(getPolarizationColor(0.9)).toBe('#dc2626'); // red
      expect(getPolarizationColor(0.7)).toBe('#f97316'); // orange
      expect(getPolarizationColor(0.5)).toBe('#eab308'); // yellow
      expect(getPolarizationColor(0.3)).toBe('#84cc16'); // lime
      expect(getPolarizationColor(0.1)).toBe('#22c55e'); // green
    });

    it('应该处理边界值', () => {
      expect(getPolarizationColor(1.0)).toBe('#dc2626');
      expect(getPolarizationColor(0.8)).toBe('#dc2626');
      expect(getPolarizationColor(0.6)).toBe('#f97316');
      expect(getPolarizationColor(0.4)).toBe('#eab308');
      expect(getPolarizationColor(0.2)).toBe('#84cc16');
      expect(getPolarizationColor(0.0)).toBe('#22c55e');
    });
  });

  describe('实际场景测试', () => {
    it('场景1：高度争议事件（正负各占45%，中性10%）', () => {
      const result = calculateSentimentPolarization(45, 45, 10);

      expect(result.polarizationIndex).toBeGreaterThan(0.8);
      expect(getPolarizationLevel(result.polarizationIndex)).toBe('严重极化');
    });

    it('场景2：普遍支持事件（正面80%，负面10%，中性10%）', () => {
      const result = calculateSentimentPolarization(80, 10, 10);

      expect(result.polarizationIndex).toBeLessThan(0.5);
      expect(getPolarizationLevel(result.polarizationIndex)).toMatch(/轻度|中度/);
    });

    it('场景3：冷漠事件（中性90%，正负各5%）', () => {
      const result = calculateSentimentPolarization(5, 5, 90);

      expect(result.polarizationIndex).toBeLessThan(0.2);
      expect(getPolarizationLevel(result.polarizationIndex)).toBe('无明显极化');
    });

    it('场景4：激烈争论事件（正负各占48%，中性4%）', () => {
      const result = calculateSentimentPolarization(48, 48, 4);

      expect(result.polarizationIndex).toBeGreaterThan(0.9);
      expect(getPolarizationLevel(result.polarizationIndex)).toBe('严重极化');
    });
  });
});
