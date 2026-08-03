import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaTypeController } from './media-type.controller';
import { MediaTypeService } from '../services/data/media-type.service';

describe('MediaTypeController (unit, mock service)', () => {
  let controller: MediaTypeController;
  let mockService: { getMediaTypeDistribution: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockService = {
      getMediaTypeDistribution: vi.fn().mockResolvedValue({
        distribution: [{ type: 'text', count: 3, percentage: 100, avgEngagement: 5 }],
        totalPosts: 3,
        trend: [],
        engagementByType: [],
      }),
    };
    controller = new MediaTypeController(mockService as unknown as MediaTypeService);
  });

  it('getDistribution 将 eventId 透传给 service', async () => {
    await controller.getDistribution('event-7');
    expect(mockService.getMediaTypeDistribution).toHaveBeenCalledWith('event-7');
  });

  it('getDistribution 原样返回 service 的 MediaTypeAnalysis 结构', async () => {
    const result = await controller.getDistribution('event-7');
    expect(result).toMatchObject({
      distribution: [{ type: 'text', count: 3, percentage: 100, avgEngagement: 5 }],
      totalPosts: 3,
      trend: [],
      engagementByType: [],
    });
  });

  it('透传不同事件 id 到 service', async () => {
    await controller.getDistribution('event-a');
    await controller.getDistribution('event-b');
    expect(mockService.getMediaTypeDistribution).toHaveBeenNthCalledWith(1, 'event-a');
    expect(mockService.getMediaTypeDistribution).toHaveBeenNthCalledWith(2, 'event-b');
  });
});
