/**
 * EventDetail 测试共享辅助文件。
 * 从拆分前的 EventDetail.test.tsx 中抽取,集中管理:
 *  - controller mock 实例
 *  - renderEventDetail 渲染辅助
 *  - setupDefaultMocks 默认 mock 设置(beforeEach 调用)
 *
 * 注意:测试文件必须将该模块作为第一个 import,确保 mock 先于被测模块注册。
 * 所有 vi.mock 块集中在 EventDetail.test-mocks 中,此处先导入以触发注册。
 */
import './EventDetail.test-mocks';
import { vi, type Mock } from 'vitest';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { root } from '@sker/core';
import { EventsController } from '@sker/sdk';
import EventDetail from './EventDetail';
import * as fixtures from './__fixtures__/eventDetailFixtures';

export const mockEventId = fixtures.mockEventId;

export const mockEventsController: {
  getEventDetail: Mock;
  getEventTimeSeries: Mock;
  getEventTrends: Mock;
  getEventKeywords: Mock;
  getEventMilestones: Mock;
  getEventTopicOverview: Mock;
  getEventInstitutions: Mock;
  getEventOpinionClusters: Mock;
  getEventEmotionMap: Mock;
  getEventUserEmotionInsights: Mock;
  getEventSentimentTrendDetailed: Mock;
  getEventRiskProfile: Mock;
  getEventAbnormalUsers: Mock;
  getEngagementTrend: Mock;
  getEventUserRelations: Mock;
  getEventGeographic: Mock;
  getSentimentHotness: Mock;
  getSentimentIntensity: Mock;
  getAnomalies: Mock;
  refreshCache: Mock;
  updateEventKeywords: Mock;
} = {
  getEventDetail: vi.fn(),
  getEventTimeSeries: vi.fn(),
  getEventTrends: vi.fn(),
  getEventKeywords: vi.fn(),
  getEventMilestones: vi.fn(),
  getEventTopicOverview: vi.fn(),
  getEventInstitutions: vi.fn(),
  getEventOpinionClusters: vi.fn(),
  getEventEmotionMap: vi.fn(),
  getEventUserEmotionInsights: vi.fn(),
  getEventSentimentTrendDetailed: vi.fn(),
  getEventRiskProfile: vi.fn(),
  getEventAbnormalUsers: vi.fn(),
  getEngagementTrend: vi.fn(),
  getEventUserRelations: vi.fn(),
  getEventGeographic: vi.fn(),
  getSentimentHotness: vi.fn(),
  getSentimentIntensity: vi.fn(),
  getAnomalies: vi.fn(),
  refreshCache: vi.fn(),
  updateEventKeywords: vi.fn(),
};

export const mockSpreadBreadthController: {
  getAnalysis: Mock;
} = {
  getAnalysis: vi.fn(),
};

export const mockMediaTypeController: {
  getDistribution: Mock;
} = {
  getDistribution: vi.fn(),
};

export const renderEventDetail: () => RenderResult = () =>
  render(
    <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
      <EventDetail />
    </MemoryRouter>,
  );

export const setupDefaultMocks = () => {
  vi.clearAllMocks();

  mockEventsController.getEventDetail.mockResolvedValue(fixtures.mockEventData);
  mockEventsController.getEventTimeSeries.mockResolvedValue(fixtures.eventTimeSeries);
  mockEventsController.getEventTrends.mockResolvedValue(fixtures.eventTrends);
  mockEventsController.getEventKeywords.mockResolvedValue(fixtures.eventKeywords);
  mockEventsController.getEventMilestones.mockResolvedValue(fixtures.eventMilestones);
  mockEventsController.getEventTopicOverview.mockResolvedValue(fixtures.eventTopicOverview);
  mockEventsController.getEventInstitutions.mockResolvedValue(fixtures.eventInstitutions);
  mockEventsController.getEventOpinionClusters.mockResolvedValue(fixtures.eventOpinionClusters);
  mockEventsController.getEventEmotionMap.mockResolvedValue(fixtures.eventEmotionMap);
  mockEventsController.getEventUserEmotionInsights.mockResolvedValue(fixtures.eventUserEmotionInsights);
  mockEventsController.getEventSentimentTrendDetailed.mockResolvedValue(fixtures.eventSentimentTrendDetailed);
  mockEventsController.getEventRiskProfile.mockResolvedValue(fixtures.eventRiskProfile);
  mockEventsController.getEventAbnormalUsers.mockResolvedValue(fixtures.eventAbnormalUsers);
  mockEventsController.getEngagementTrend.mockResolvedValue(fixtures.engagementTrend);
  mockEventsController.getEventUserRelations.mockResolvedValue(fixtures.eventUserRelations);
  mockEventsController.getEventGeographic.mockResolvedValue(fixtures.eventGeographic);
  mockEventsController.getSentimentHotness.mockResolvedValue(fixtures.sentimentHotness);
  mockEventsController.getSentimentIntensity.mockResolvedValue(fixtures.sentimentIntensity);
  mockEventsController.getAnomalies.mockResolvedValue(fixtures.anomalies);
  mockEventsController.refreshCache.mockResolvedValue({ success: true });
  mockEventsController.updateEventKeywords.mockResolvedValue({ success: true });

  mockSpreadBreadthController.getAnalysis.mockResolvedValue(fixtures.spreadBreadth);

  mockMediaTypeController.getDistribution.mockResolvedValue(fixtures.mediaTypeDistribution);

  vi.mocked(root.get).mockImplementation((token: any) => {
    if (token === EventsController) {
      return mockEventsController as any;
    }
    if (token.name === 'SpreadBreadthController') {
      return mockSpreadBreadthController as any;
    }
    if (token.name === 'MediaTypeController') {
      return mockMediaTypeController as any;
    }
    if (token.name === 'CommunityDetectionController') {
      return { getAnalysis: vi.fn().mockResolvedValue({ communities: [] }) } as any;
    }
    if (token.name === 'PropagationVelocityController') {
      return { getVelocity: vi.fn().mockResolvedValue({ velocityScore: 0.8 }) } as any;
    }
    if (token.name === 'InfluencePredictionController') {
      return { getInfluencePrediction: vi.fn().mockResolvedValue({ predictedReach: 10000 }) } as any;
    }
    if (token.name === 'CommunityEvolutionController') {
      return { getAnalysis: vi.fn().mockResolvedValue({ timeSlices: [] }) } as any;
    }
    if (token.name === 'UserStratificationController') {
      return { getStratification: vi.fn().mockResolvedValue({ layers: [], engagementGini: 0, totalUsers: 0, summary: { coreRatio: 0, activeRatio: 0, paretoIndex: 0 } }) } as any;
    }
    if (token.name === 'CommentDepthController') {
      return { getAnalysis: vi.fn().mockResolvedValue({}) } as any;
    }
    if (token.name === 'PostingTimeController') {
      return { getHeatmap: vi.fn().mockResolvedValue({}) } as any;
    }
    if (token.name === 'NetworkCentralityController') {
      return { getAnalysis: vi.fn().mockResolvedValue({ nodes: [] }) } as any;
    }
    if (token.name === 'UserRelationController') {
      return { getNetwork: vi.fn().mockResolvedValue({ nodes: [], edges: [], statistics: { totalUsers: 0, totalRelations: 0, avgDegree: 0, density: 0 } }) } as any;
    }
    return {} as any;
  });
};
