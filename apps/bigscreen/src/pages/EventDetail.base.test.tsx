/**
 * EventDetail 测试 - 基础渲染与数据加载
 *
 * 说明:必须将 EventDetail.test-utils 作为第一个 import,
 * 确保其中注册的 vi.mock 在被测模块加载前生效。
 */
import {
  mockEventId,
  mockEventsController,
  renderEventDetail,
  setupDefaultMocks,
} from './EventDetail.test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

beforeEach(() => {
  setupDefaultMocks();
});

describe('EventDetail - 基础渲染与数据加载', () => {
  it('在基础数据未返回前显示骨架屏', () => {
    mockEventsController.getEventDetail.mockReturnValue(new Promise(() => {}));

    renderEventDetail();

    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('加载后渲染当前页头和事件信息卡片', async () => {
    renderEventDetail();

    expect(await screen.findByText('测试事件标题')).toBeInTheDocument();
    expect(screen.getByText('事件详情')).toBeInTheDocument();
    expect(screen.getByText('科技')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '更新缓存' })).toBeInTheDocument();
    expect(screen.getByText('#AI')).toBeInTheDocument();
  });

  it('初始化时只加载基础数据和 overview 依赖', async () => {
    renderEventDetail();
    await screen.findByText('测试事件标题');

    expect(mockEventsController.getEventDetail).toHaveBeenCalledWith(mockEventId);
    expect(mockEventsController.getEventTimeSeries).toHaveBeenCalledWith(mockEventId);
    expect(mockEventsController.getEventTrends).toHaveBeenCalledWith(mockEventId);
    expect(mockEventsController.getEventKeywords).toHaveBeenCalledWith(mockEventId);
    expect(mockEventsController.getEngagementTrend).toHaveBeenCalledWith(mockEventId);

    expect(mockEventsController.getEventUserRelations).not.toHaveBeenCalled();
    expect(mockEventsController.getEventGeographic).not.toHaveBeenCalled();
    expect(mockEventsController.getSentimentHotness).not.toHaveBeenCalled();
    expect(mockEventsController.getSentimentIntensity).not.toHaveBeenCalled();
    expect(mockEventsController.getAnomalies).not.toHaveBeenCalled();
    expect(mockEventsController.getEventOpinionClusters).not.toHaveBeenCalled();
    expect(mockEventsController.getEventEmotionMap).not.toHaveBeenCalled();
    expect(mockEventsController.getEventUserEmotionInsights).not.toHaveBeenCalled();
    expect(mockEventsController.getEventSentimentTrendDetailed).not.toHaveBeenCalled();
    expect(mockEventsController.getEventRiskProfile).not.toHaveBeenCalled();
    expect(mockEventsController.getEventAbnormalUsers).not.toHaveBeenCalled();
  });
});
