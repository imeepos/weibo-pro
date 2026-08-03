/**
 * EventDetail 测试 - Tab 懒加载
 *
 * 说明:必须将 EventDetail.test-utils 作为第一个 import,
 * 确保其中注册的 vi.mock 在被测模块加载前生效。
 */
import {
  mockEventId,
  mockEventsController,
  mockSpreadBreadthController,
  renderEventDetail,
  setupDefaultMocks,
} from './EventDetail.test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

beforeEach(() => {
  setupDefaultMocks();
});

describe('EventDetail - Tab 懒加载', () => {
  it('切换到关系网络 tab 时才加载网络数据', async () => {
    renderEventDetail();
    await screen.findByText('测试事件标题');

    fireEvent.click(screen.getByRole('tab', { name: /关系网络/ }));

    await waitFor(() => {
      expect(mockEventsController.getEventUserRelations).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('用户关系网络')).toBeInTheDocument();
  });

  it('切换到趋势和情感 tab 时才加载对应模块', async () => {
    renderEventDetail();
    await screen.findByText('测试事件标题');

    fireEvent.click(screen.getByRole('tab', { name: /趋势分析/ }));

    await waitFor(() => {
      expect(mockSpreadBreadthController.getAnalysis).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsController.getAnomalies).toHaveBeenCalledWith(mockEventId);
    });

    expect(screen.getByText('传播广度分析')).toBeInTheDocument();
    expect(screen.getByText('媒体类型分布')).toBeInTheDocument();
    expect(screen.getByText('异常检测时间线')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /情感分析/ }));
    expect(await screen.findByTestId('sentiment-transition')).toBeInTheDocument();
    expect(screen.getByTestId('sentiment-hotness-chart')).toBeInTheDocument();
    expect(mockEventsController.getSentimentHotness).toHaveBeenCalledWith(mockEventId);
    // 已移除的重复/低价值情感模块不应再请求或渲染
    expect(mockEventsController.getSentimentIntensity).not.toHaveBeenCalled();
    expect(mockEventsController.getEventEmotionMap).not.toHaveBeenCalled();
    expect(mockEventsController.getEventUserEmotionInsights).not.toHaveBeenCalled();
    expect(mockEventsController.getEventSentimentTrendDetailed).not.toHaveBeenCalled();
    expect(screen.queryByText('情绪地图')).not.toBeInTheDocument();
    expect(screen.queryByText('用户情绪洞察')).not.toBeInTheDocument();
    expect(screen.queryByText('详细情感趋势')).not.toBeInTheDocument();
  });

  it('切换到观点汇集 tab 时才加载观点簇数据', async () => {
    renderEventDetail();
    await screen.findByText('测试事件标题');

    fireEvent.click(screen.getByRole('tab', { name: /观点汇集/ }));

    await waitFor(() => {
      expect(mockEventsController.getEventOpinionClusters).toHaveBeenCalledWith(mockEventId);
    });

    expect(screen.getByText('观点簇概览')).toBeInTheDocument();
    expect(screen.getByText('批评观点')).toBeInTheDocument();
  });

  it('切换到用户分析 tab 时加载风险画像与异常用户面板', async () => {
    renderEventDetail();
    await screen.findByText('测试事件标题');

    fireEvent.click(screen.getByRole('tab', { name: /用户分析/ }));

    await waitFor(() => {
      expect(mockEventsController.getEventRiskProfile).toHaveBeenCalledWith(mockEventId);
      expect(mockEventsController.getEventAbnormalUsers).toHaveBeenCalledWith(mockEventId);
    });

    expect(screen.getByText('用户风险画像')).toBeInTheDocument();
    expect(screen.getByText('异常用户面板')).toBeInTheDocument();
    expect(screen.getByText('用户A')).toBeInTheDocument();
    expect(screen.getByText('夜间活跃 6')).toBeInTheDocument();
  });
});
