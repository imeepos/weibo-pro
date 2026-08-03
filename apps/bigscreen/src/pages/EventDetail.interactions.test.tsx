/**
 * EventDetail 测试 - 交互与容错
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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { root } from '@sker/core';
import { EventsController } from '@sker/sdk';
import EventDetail from './EventDetail';

beforeEach(() => {
  setupDefaultMocks();
});

describe('EventDetail - 交互与容错', () => {
  it('点击更新缓存时调用 refreshCache 并刷新基础数据', async () => {
    renderEventDetail();
    await screen.findByText('测试事件标题');

    fireEvent.click(screen.getByRole('button', { name: '更新缓存' }));

    await waitFor(() => {
      expect(mockEventsController.refreshCache).toHaveBeenCalledWith(mockEventId);
    });
  });

  it('renders milestones, topic summary, and institution participation in overview', async () => {
    render(
      <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
        <EventDetail />
      </MemoryRouter>,
    );

    expect(await screen.findByText('事件里程碑')).toBeInTheDocument();
    expect(screen.getByText('机构账号参与')).toBeInTheDocument();
    expect(screen.getByTestId('event-milestone-widget')).toHaveTextContent('热度峰值');
    expect(screen.getByTestId('institution-participation-panel')).toHaveTextContent('新华社');
    // 高频话题分布已移除：与关键词云重复展示同一关键词权重数据
    expect(screen.queryByText('高频话题分布')).not.toBeInTheDocument();
  });

  it('keeps successful trend widgets visible when one trend request fails', async () => {
    const spreadController = {
      getAnalysis: vi.fn().mockResolvedValue({
        totalReposts: 100,
        uniqueReposters: 80,
        spreadDepth: 5,
        spreadWidth: 4.5,
        breadthIndex: 0.75,
        propagationPaths: [],
        spreadTimeline: [],
        repostByUserType: [],
      }),
    };

    const mediaController = {
      getDistribution: vi.fn().mockRejectedValue(new Error('media failed')),
    };

    vi.mocked(root.get).mockImplementation((token: any) => {
      if (token === EventsController) return mockEventsController as any;
      if (token.name === 'SpreadBreadthController') return spreadController as any;
      if (token.name === 'MediaTypeController') return mediaController as any;
      if (token.name === 'CommunityDetectionController') {
        return { getAnalysis: vi.fn().mockResolvedValue({ communities: [] }) } as any;
      }
      return {} as any;
    });

    render(
      <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
        <EventDetail />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: '趋势分析' }));

    expect(await screen.findByTestId('spread-breadth-chart')).toBeInTheDocument();
    expect(await screen.findByText('media failed')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '重试媒体类型分布' }),
    ).toBeInTheDocument();
  });

  it('renders metric explanation triggers for trend and sentiment widgets', async () => {
    render(
      <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
        <EventDetail />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: '趋势分析' }));
    expect(
      await screen.findByRole('button', { name: '传播广度分析指标说明' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '情感分析' }));
    expect(
      await screen.findByRole('button', { name: '情感转变追踪指标说明' }),
    ).toBeInTheDocument();
  });
});
