import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { root } from '@sker/core';
import { PostingTimeService } from '../services/data/posting-time.service';
import { PostingTimeController } from './posting-time.controller';

describe('PostingTimeController (unit, mock service)', () => {
  // root 会缓存已解析的 service 实例，因此 mock 必须在整个文件内复用同一实例
  const mockService = {
    getPostingTimeHeatmap: vi.fn(),
  };
  let controller: PostingTimeController;

  const defaultHeatmap = {
    hourlyDistribution: new Array(24).fill(0),
    weekdayDistribution: new Array(7).fill(0),
    heatmapMatrix: Array(7).fill(null).map(() => Array(24).fill(0)),
    peakTime: { hour: 0, weekday: 0, count: 0, label: '无数据' },
    offPeakTime: { hour: 0, weekday: 0, count: 0, label: '无数据' },
    totalPosts: 0,
    insights: [],
  };

  beforeAll(() => {
    root.set([{ provide: PostingTimeService, useValue: mockService }]);
  });

  beforeEach(() => {
    mockService.getPostingTimeHeatmap.mockClear().mockResolvedValue(defaultHeatmap);
    controller = new PostingTimeController();
  });

  it('getHeatmap 将 eventId 透传给 service', async () => {
    await controller.getHeatmap('event-42');
    expect(mockService.getPostingTimeHeatmap).toHaveBeenCalledWith('event-42');
  });

  it('getHeatmap 原样返回 service 的 heatmap 结构', async () => {
    const result = await controller.getHeatmap('event-42');
    expect(result).toMatchObject({
      hourlyDistribution: expect.any(Array),
      weekdayDistribution: expect.any(Array),
      heatmapMatrix: expect.any(Array),
      peakTime: expect.any(Object),
      offPeakTime: expect.any(Object),
      totalPosts: 0,
      insights: expect.any(Array),
    });
  });

  it('getHeatmap 透传不同事件 id', async () => {
    await controller.getHeatmap('event-1');
    await controller.getHeatmap('event-2');
    expect(mockService.getPostingTimeHeatmap).toHaveBeenNthCalledWith(1, 'event-1');
    expect(mockService.getPostingTimeHeatmap).toHaveBeenNthCalledWith(2, 'event-2');
  });
});
