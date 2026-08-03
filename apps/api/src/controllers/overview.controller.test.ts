import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { root } from '@sker/core';
import { OverviewService } from '../services/data/overview.service';
import { OverviewController } from './overview.controller';
import type { TimeRange } from '../services/data/types';

describe('OverviewController (unit, mock service)', () => {
  // root 会缓存已解析的 service 实例，因此 mock 必须在整个文件内复用同一实例
  const mockService = {
    getStatistics: vi.fn(),
    getSentiment: vi.fn(),
    getLocations: vi.fn(),
  };
  let controller: OverviewController;

  beforeAll(() => {
    root.set([{ provide: OverviewService, useValue: mockService }]);
  });

  beforeEach(() => {
    mockService.getStatistics.mockClear().mockResolvedValue({ eventCount: 1 });
    mockService.getSentiment.mockClear().mockResolvedValue({ positive: 0.6, negative: 0.4 });
    mockService.getLocations.mockClear().mockResolvedValue([{ name: '北京', count: 10 }]);
    controller = new OverviewController();
  });

  describe('时间范围校验', () => {
    it('传递合法 timeRange 时透传给 service', async () => {
      await controller.getStatistics('7d');
      expect(mockService.getStatistics).toHaveBeenCalledWith('7d');

      await controller.getSentiment('30d');
      expect(mockService.getSentiment).toHaveBeenCalledWith('30d');

      await controller.getLocations('1h');
      expect(mockService.getLocations).toHaveBeenCalledWith('1h');
    });

    it('缺失 timeRange 时默认使用 24h', async () => {
      await controller.getStatistics(undefined);
      expect(mockService.getStatistics).toHaveBeenCalledWith('24h');
    });

    it('非法 timeRange 时回退到 24h', async () => {
      await controller.getStatistics('bogus' as never);
      expect(mockService.getStatistics).toHaveBeenCalledWith('24h');
    });

    it('支持 90d/180d/365d/all 等扩展范围', async () => {
      const validRanges: TimeRange[] = ['all', '6h', '12h', '90d', '180d', '365d'];
      for (const range of validRanges) {
        await controller.getStatistics(range);
        expect(mockService.getStatistics).toHaveBeenLastCalledWith(range);
      }
    });
  });

  describe('响应结构', () => {
    it('getStatistics 原样返回 service 结果', async () => {
      const result = await controller.getStatistics('24h');
      expect(result).toEqual({ eventCount: 1 });
    });

    it('getSentiment 原样返回 service 结果', async () => {
      const result = await controller.getSentiment('24h');
      expect(result).toEqual({ positive: 0.6, negative: 0.4 });
    });

    it('getLocations 原样返回 service 结果', async () => {
      const result = await controller.getLocations('24h');
      expect(result).toEqual([{ name: '北京', count: 10 }]);
    });
  });
});
