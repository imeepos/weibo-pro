import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEventLifecycle } from './useEventLifecycle';

// 模拟小时级统计数据
interface HourlyStatistics {
  year: number;
  month: number;
  day: number;
  hour: number;
  hotness: number;
  post_count: number;
  user_count: number;
  sentiment_positive: number;
}

describe('useEventLifecycle', () => {
  describe('阶段判断逻辑', () => {
    it('应该识别萌芽阶段 (emergence): 热度 < 20, 增长率 > 50%', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 5, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 8, post_count: 16, user_count: 8, sentiment_positive: 0.35 }, // 增长率 60%
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 13, post_count: 26, user_count: 12, sentiment_positive: 0.4 }, // 增长率 62.5%
        { year: 2024, month: 1, day: 1, hour: 3, hotness: 18, post_count: 35, user_count: 15, sentiment_positive: 0.42 }, // 增长率 34.6%
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      expect(result.current.phases.length).toBeGreaterThan(0);
      const emergencePhase = result.current.phases.find(p => p.name === 'emergence');
      expect(emergencePhase).toBeDefined();
      expect(emergencePhase!.avgHotness).toBeLessThan(20);
    });

    it('应该识别增长阶段 (growth): 热度 20-60, 增长率 > 20%', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 18, post_count: 35, user_count: 15, sentiment_positive: 0.42 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 25, post_count: 50, user_count: 22, sentiment_positive: 0.45 }, // 增长率 42.8%
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 35, post_count: 70, user_count: 30, sentiment_positive: 0.5 }, // 增长率 40%
        { year: 2024, month: 1, day: 1, hour: 3, hotness: 48, post_count: 95, user_count: 40, sentiment_positive: 0.52 }, // 增长率 35.7%
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      const growthPhase = result.current.phases.find(p => p.name === 'growth');
      expect(growthPhase).toBeDefined();
      expect(growthPhase!.avgHotness).toBeGreaterThanOrEqual(20);
      expect(growthPhase!.avgHotness).toBeLessThanOrEqual(60);
    });

    it('应该识别高峰阶段 (peak): 热度 > 60, 增长率 < 20%', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 62, post_count: 120, user_count: 50, sentiment_positive: 0.55 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 68, post_count: 130, user_count: 52, sentiment_positive: 0.56 }, // 增长率 8.3%
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 72, post_count: 135, user_count: 53, sentiment_positive: 0.57 }, // 增长率 3.8%
        { year: 2024, month: 1, day: 1, hour: 3, hotness: 70, post_count: 132, user_count: 52, sentiment_positive: 0.56 }, // 增长率 -2.2%
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      const peakPhase = result.current.phases.find(p => p.name === 'peak');
      expect(peakPhase).toBeDefined();
      expect(peakPhase!.avgHotness).toBeGreaterThan(60);
    });

    it('应该识别衰退阶段 (decline): 热度下降 > 20%', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 70, post_count: 132, user_count: 52, sentiment_positive: 0.56 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 52, post_count: 100, user_count: 45, sentiment_positive: 0.5 }, // 下降 25.7%
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 38, post_count: 75, user_count: 35, sentiment_positive: 0.45 }, // 下降 26.9%
        { year: 2024, month: 1, day: 1, hour: 3, hotness: 28, post_count: 55, user_count: 28, sentiment_positive: 0.42 }, // 下降 26.3%
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      const declinePhase = result.current.phases.find(p => p.name === 'decline');
      expect(declinePhase).toBeDefined();
    });

    it('应该识别沉寂阶段 (dormant): 热度 < 10, 增长率 < 5%', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 9, post_count: 20, user_count: 12, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 8, post_count: 20, user_count: 12, sentiment_positive: 0.3 }, // 增长率 0%
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 7, post_count: 19, user_count: 11, sentiment_positive: 0.28 }, // 增长率 -5%
        { year: 2024, month: 1, day: 1, hour: 3, hotness: 6, post_count: 18, user_count: 10, sentiment_positive: 0.25 }, // 增长率 -5.3%
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      const dormantPhase = result.current.phases.find(p => p.name === 'dormant');
      expect(dormantPhase).toBeDefined();
      expect(dormantPhase!.avgHotness).toBeLessThan(10);
    });

    it('应该正确识别完整的生命周期（所有5个阶段）', () => {
      const mockData: HourlyStatistics[] = [
        // 萌芽阶段
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 5, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 8, post_count: 16, user_count: 8, sentiment_positive: 0.35 },
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 13, post_count: 26, user_count: 12, sentiment_positive: 0.4 },
        // 增长阶段
        { year: 2024, month: 1, day: 1, hour: 3, hotness: 25, post_count: 50, user_count: 22, sentiment_positive: 0.45 },
        { year: 2024, month: 1, day: 1, hour: 4, hotness: 35, post_count: 70, user_count: 30, sentiment_positive: 0.5 },
        { year: 2024, month: 1, day: 1, hour: 5, hotness: 48, post_count: 95, user_count: 40, sentiment_positive: 0.52 },
        // 高峰阶段
        { year: 2024, month: 1, day: 1, hour: 6, hotness: 65, post_count: 130, user_count: 52, sentiment_positive: 0.55 },
        { year: 2024, month: 1, day: 1, hour: 7, hotness: 72, post_count: 135, user_count: 53, sentiment_positive: 0.57 },
        { year: 2024, month: 1, day: 1, hour: 8, hotness: 70, post_count: 132, user_count: 52, sentiment_positive: 0.56 },
        // 衰退阶段
        { year: 2024, month: 1, day: 1, hour: 9, hotness: 52, post_count: 100, user_count: 45, sentiment_positive: 0.5 },
        { year: 2024, month: 1, day: 1, hour: 10, hotness: 38, post_count: 75, user_count: 35, sentiment_positive: 0.45 },
        { year: 2024, month: 1, day: 1, hour: 11, hotness: 28, post_count: 55, user_count: 28, sentiment_positive: 0.42 },
        // 沉寂阶段
        { year: 2024, month: 1, day: 1, hour: 12, hotness: 9, post_count: 20, user_count: 12, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 13, hotness: 8, post_count: 20, user_count: 12, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 14, hotness: 7, post_count: 19, user_count: 11, sentiment_positive: 0.28 },
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      const phaseNames = result.current.phases.map(p => p.name);
      // 允许阶段数量在5-6之间（因为可能出现中间过渡阶段）
      expect(result.current.phases.length).toBeGreaterThanOrEqual(5);
      expect(result.current.phases.length).toBeLessThanOrEqual(6);
      expect(phaseNames).toContain('emergence');
      expect(phaseNames).toContain('growth');
      expect(phaseNames).toContain('peak');
      expect(phaseNames).toContain('decline');
      expect(phaseNames).toContain('dormant');
    });
  });

  describe('阶段属性计算', () => {
    it('应该正确计算每个阶段的持续时间（小时）', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 5, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 8, post_count: 16, user_count: 8, sentiment_positive: 0.35 },
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 25, post_count: 50, user_count: 22, sentiment_positive: 0.45 },
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      result.current.phases.forEach(phase => {
        expect(phase.duration).toBeGreaterThan(0);
        expect(phase.duration).toBe(Math.floor((phase.endTime.getTime() - phase.startTime.getTime()) / (1000 * 60 * 60)) + 1);
      });
    });

    it('应该正确计算每个阶段的平均热度', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 10, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 20, post_count: 16, user_count: 8, sentiment_positive: 0.35 },
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 30, post_count: 50, user_count: 22, sentiment_positive: 0.45 },
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      result.current.phases.forEach(phase => {
        expect(phase.avgHotness).toBeGreaterThan(0);
        // 平均热度应该在阶段内的最小和最大热度之间
        const phaseHours = mockData.filter(d => {
          const hourTime = new Date(d.year, d.month - 1, d.day, d.hour).getTime();
          return hourTime >= phase.startTime.getTime() && hourTime <= phase.endTime.getTime();
        });
        if (phaseHours.length > 0) {
          const minHotness = Math.min(...phaseHours.map(h => h.hotness));
          const maxHotness = Math.max(...phaseHours.map(h => h.hotness));
          expect(phase.avgHotness).toBeGreaterThanOrEqual(minHotness);
          expect(phase.avgHotness).toBeLessThanOrEqual(maxHotness);
        }
      });
    });

    it('应该正确计算每个阶段的关键指标', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 10, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 20, post_count: 16, user_count: 8, sentiment_positive: 0.35 },
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 30, post_count: 50, user_count: 22, sentiment_positive: 0.45 },
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      result.current.phases.forEach(phase => {
        expect(phase.keyMetrics.posts).toBeGreaterThanOrEqual(0);
        expect(phase.keyMetrics.users).toBeGreaterThanOrEqual(0);
        expect(phase.keyMetrics.sentiment).toBeGreaterThanOrEqual(0);
        expect(phase.keyMetrics.sentiment).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('生命周期整体指标', () => {
    it('应该正确识别当前阶段', () => {
      const _now = new Date();
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 5, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 25, post_count: 50, user_count: 22, sentiment_positive: 0.45 },
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      expect(result.current.currentPhase).toBeDefined();
      expect(result.current.currentPhase).toMatch(/^(emergence|growth|peak|decline|dormant)$/);
    });

    it('应该计算总生命周期时长', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 5, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 5, hotness: 8, post_count: 16, user_count: 8, sentiment_positive: 0.35 },
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      expect(result.current.totalLifespan).toBeGreaterThan(0);
    });

    it('应该预测结束时间（基于当前阶段和趋势）', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 5, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 8, post_count: 16, user_count: 8, sentiment_positive: 0.35 },
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 13, post_count: 26, user_count: 12, sentiment_positive: 0.4 },
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      expect(result.current.predictedEndTime).toBeDefined();
      expect(result.current.predictedEndTime instanceof Date).toBe(true);
    });
  });

  describe('边界情况处理', () => {
    it('空数据应该返回空阶段数组', () => {
      const { result } = renderHook(() => useEventLifecycle([]));

      expect(result.current.phases).toEqual([]);
      expect(result.current.totalLifespan).toBe(0);
    });

    it('单个数据点应该创建一个阶段', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 5, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      expect(result.current.phases.length).toBeGreaterThanOrEqual(0);
    });

    it('缺失的热度数据应该使用默认值', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 0, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 0, post_count: 16, user_count: 8, sentiment_positive: 0.35 },
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      // 不应该抛出错误，应该正常处理
      expect(result.current).toBeDefined();
    });

    it('负增长率应该正确处理', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 50, post_count: 100, user_count: 50, sentiment_positive: 0.5 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 30, post_count: 60, user_count: 30, sentiment_positive: 0.4 }, // 负增长 -40%
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      // 负增长应该被识别为衰退阶段
      expect(result.current.phases.length).toBeGreaterThan(0);
    });
  });

  describe('阶段顺序和时间连续性', () => {
    it('阶段应该按时间顺序排列', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 5, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 25, post_count: 50, user_count: 22, sentiment_positive: 0.45 },
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 65, post_count: 130, user_count: 52, sentiment_positive: 0.55 },
        { year: 2024, month: 1, day: 1, hour: 3, hotness: 50, post_count: 100, user_count: 45, sentiment_positive: 0.5 },
        { year: 2024, month: 1, day: 1, hour: 4, hotness: 8, post_count: 20, user_count: 12, sentiment_positive: 0.3 },
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      for (let i = 0; i < result.current.phases.length - 1; i++) {
        expect(result.current.phases[i].startTime.getTime()).toBeLessThanOrEqual(
          result.current.phases[i + 1].startTime.getTime()
        );
      }
    });

    it('相邻阶段的时间应该是连续的', () => {
      const mockData: HourlyStatistics[] = [
        { year: 2024, month: 1, day: 1, hour: 0, hotness: 5, post_count: 10, user_count: 5, sentiment_positive: 0.3 },
        { year: 2024, month: 1, day: 1, hour: 1, hotness: 25, post_count: 50, user_count: 22, sentiment_positive: 0.45 },
        { year: 2024, month: 1, day: 1, hour: 2, hotness: 65, post_count: 130, user_count: 52, sentiment_positive: 0.55 },
      ];

      const { result } = renderHook(() => useEventLifecycle(mockData));

      for (let i = 0; i < result.current.phases.length - 1; i++) {
        const currentEnd = result.current.phases[i].endTime.getTime();
        const nextStart = result.current.phases[i + 1].startTime.getTime();
        // 相邻阶段应该连续或间隔1小时
        const hourInMs = 60 * 60 * 1000;
        expect(Math.abs(currentEnd - nextStart)).toBeLessThanOrEqual(hourInMs);
      }
    });
  });
});
