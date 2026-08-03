import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @sker/core and @sker/sdk before importing ChartsAPI
vi.mock('@sker/core', async () => {
  const actual = await vi.importActual('@sker/core');
  return {
    ...actual,
    createLogger: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
    root: {
      get: vi.fn(),
    },
  };
});

vi.mock('@sker/sdk', () => ({
  ChartsController: class MockChartsController {},
}));

vi.mock('@/utils/errorHandler', () => ({
  withErrorBoundary: (fn: any) => fn,
}));

import { ChartsAPI } from './charts';
import { root } from '@sker/core';
import { ChartsController } from '@sker/sdk';
import { createMockChartsController } from './charts.test.fixtures';

describe('ChartsAPI', () => {
  let mockController: Record<string, jest.Mock>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockController = createMockChartsController() as any;

    vi.mocked(root.get).mockReturnValue(mockController as any);
  });

  describe('getAgeDistribution', () => {
    it('should fetch age distribution successfully', async () => {
      const result = await ChartsAPI.getAgeDistribution('24h');

      expect(root.get).toHaveBeenCalledWith(ChartsController);
      expect(mockController.getAgeDistribution).toHaveBeenCalledWith('24h');
      expect(result).toEqual([
        { age: '18-25', value: 450, percentage: 0 },
        { age: '26-35', value: 680, percentage: 0 },
      ]);
    });
  });

  describe('getGenderDistribution', () => {
    it('should fetch gender distribution successfully', async () => {
      const result = await ChartsAPI.getGenderDistribution('24h');

      expect(mockController.getGenderDistribution).toHaveBeenCalledWith('24h');
      expect(result).toEqual([
        { name: '男', value: 520, percentage: 0, color: '' },
        { name: '女', value: 480, percentage: 0, color: '' },
      ]);
    });
  });

  describe('getSentimentTrend', () => {
    it('should fetch sentiment trend with hours parameter', async () => {
      const result = await ChartsAPI.getSentimentTrend(24);

      expect(mockController.getSentimentTrend).toHaveBeenCalledWith('24h');
      expect(result).toEqual([
        {
          timestamp: '2024-01-01',
          positive: 60,
          negative: 20,
          neutral: 20,
          total: 100,
        },
        {
          timestamp: '2024-01-02',
          positive: 65,
          negative: 18,
          neutral: 17,
          total: 100,
        },
      ]);
    });

    it('should convert hours to correct time range', async () => {
      await ChartsAPI.getSentimentTrend(1);
      expect(mockController.getSentimentTrend).toHaveBeenCalledWith('1h');

      await ChartsAPI.getSentimentTrend(6);
      expect(mockController.getSentimentTrend).toHaveBeenCalledWith('6h');

      await ChartsAPI.getSentimentTrend(48);
      expect(mockController.getSentimentTrend).toHaveBeenCalledWith('7d');

      await ChartsAPI.getSentimentTrend(200);
      expect(mockController.getSentimentTrend).toHaveBeenCalledWith('30d');
    });
  });

  describe('getGeographicData', () => {
    it('should fetch geographic data successfully', async () => {
      const result = await ChartsAPI.getGeographicData();

      expect(mockController.getGeographic).toHaveBeenCalled();
      expect(result).toEqual([
        { name: '北京', value: 500 },
        { name: '上海', value: 450 },
      ]);
    });
  });

  describe('getEventTypes', () => {
    it('should fetch event types distribution', async () => {
      const result = await ChartsAPI.getEventTypes();

      expect(mockController.getEventTypes).toHaveBeenCalled();
      // The implementation maps over series, not categories
      // With one series element, we get one result
      expect(result).toEqual([
        { type: 'Politics', count: 150, percentage: 0 },
      ]);
    });
  });

  describe('getWordCloudData', () => {
    it('should fetch word cloud data with default parameters', async () => {
      const result = await ChartsAPI.getWordCloudData();

      expect(mockController.getWordCloud).toHaveBeenCalledWith(undefined, 50, undefined);
      expect(result).toEqual([
        { text: 'keyword1', value: 100 },
        { text: 'keyword2', value: 80 },
      ]);
    });

    it('should fetch word cloud data with custom parameters', async () => {
      const result = await ChartsAPI.getWordCloudData(100, '24h', 'positive');

      expect(mockController.getWordCloud).toHaveBeenCalledWith('24h', 100, 'positive');
      expect(result).toEqual([
        { text: 'keyword1', value: 100 },
        { text: 'keyword2', value: 80 },
      ]);
    });
  });

  describe('getEventCountSeries', () => {
    it('should fetch event count series', async () => {
      const result = await ChartsAPI.getEventCountSeries(7);

      expect(mockController.getEventCountSeries).toHaveBeenCalledWith('7d');
      expect(result).toEqual([
        { timestamp: '2024-01-01', value: 10 },
        { timestamp: '2024-01-02', value: 15 },
      ]);
    });
  });

  describe('getPostCountSeries', () => {
    it('should fetch post count series', async () => {
      const result = await ChartsAPI.getPostCountSeries(7);

      expect(mockController.getPostCountSeries).toHaveBeenCalledWith('7d');
      expect(result).toEqual([
        { timestamp: '00:00', value: 50 },
        { timestamp: '01:00', value: 45 },
      ]);
    });
  });

  describe('getSentimentData', () => {
    it('should fetch sentiment summary data', async () => {
      const result = await ChartsAPI.getSentimentData();

      expect(mockController.getSentimentData).toHaveBeenCalled();
      expect(result).toEqual({
        positive: 60,
        negative: 20,
        neutral: 20,
        total: 100,
      });
    });
  });

  describe('getBatchChartData', () => {
    it('should fetch batch chart data', async () => {
      const result = await ChartsAPI.getBatchChartData(['ageDistribution', 'genderDistribution']);

      expect(mockController.getBatchCharts).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // Legacy compatibility methods
  describe('Legacy compatibility methods', () => {
    it('getOverviewStats should call getSentimentData', async () => {
      const result = await ChartsAPI.getOverviewStats();

      expect(mockController.getSentimentData).toHaveBeenCalled();
      expect(result).toEqual({
        positive: 60,
        negative: 20,
        neutral: 20,
        total: 100,
      });
    });

    it('getEmotionCurve should call getSentimentTrend', async () => {
      await ChartsAPI.getEmotionCurve(7);

      // getSentimentTrend converts hours to time range: 7 hours -> 12h (6 < 7 <= 12)
      expect(mockController.getSentimentTrend).toHaveBeenCalledWith('12h');
    });

    it('getEventCount should convert range to days', async () => {
      await ChartsAPI.getEventCount('7d');
      expect(mockController.getEventCountSeries).toHaveBeenCalledWith('7d');

      await ChartsAPI.getEventCount('30d');
      expect(mockController.getEventCountSeries).toHaveBeenCalledWith('30d');
    });

    it('getHotEvents should call getWordCloudData', async () => {
      await ChartsAPI.getHotEvents(10, '24h');

      expect(mockController.getWordCloud).toHaveBeenCalledWith('24h', 10, undefined);
    });

    it('getPostCount should convert range to days', async () => {
      await ChartsAPI.getPostCount('24h');
      // range='24h' -> days=1 -> time range='24h' (days <= 1)
      expect(mockController.getPostCountSeries).toHaveBeenCalledWith('24h');

      await ChartsAPI.getPostCount('7d');
      // range='7d' -> days=7 -> time range='7d'
      expect(mockController.getPostCountSeries).toHaveBeenCalledWith('7d');
    });

    it('getEventTypeDistribution should call getEventTypes', async () => {
      await ChartsAPI.getEventTypeDistribution();

      expect(mockController.getEventTypes).toHaveBeenCalled();
    });

    it('getWordCloud should call getWordCloudData', async () => {
      await ChartsAPI.getWordCloud(100, '24h');

      expect(mockController.getWordCloud).toHaveBeenCalledWith('24h', 100, undefined);
    });

    it('getHeatmapData should convert geographic data', async () => {
      const result = await ChartsAPI.getHeatmapData();

      expect(mockController.getGeographic).toHaveBeenCalled();
      expect(result).toEqual([[0, 0, 500], [1, 0, 450]]);
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockController.getAgeDistribution.mockRejectedValue(new Error('API Error'));

      await expect(ChartsAPI.getAgeDistribution()).rejects.toThrow('API Error');
    });
  });
});
