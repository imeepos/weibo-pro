import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserDossierPanel } from './UserDossierPanel';

describe('UserDossierPanel', () => {
  it('renders behavior, sentiment, and coordination sections from dossier data', () => {
    render(
      <UserDossierPanel
        dossier={{
          accountSnapshot: {
            weiboUserId: '100',
            screenName: '用户A',
            displayName: '用户A',
            avatar: null,
            description: '简介',
            location: '陕西',
            followersCount: 1200,
            friendsCount: 80,
            statusesCount: 320,
            verified: true,
            verifiedType: 0,
            verifiedReason: null,
            creditScore: 80,
            urisk: 60,
            createdAt: null,
          },
          eventRiskContext: {
            eventId: 'event-1',
            eventRiskLevel: 'high',
            eventRiskScore: 92,
            riskSignals: [{ type: 'negative_ratio', label: '高负向占比', score: 92 }],
            firstSeenAt: null,
            lastSeenAt: null,
            eventPostCount: 2,
            eventInteractionCount: 12,
          },
          historyCoverage: {
            windowDays: 90,
            collectedPostCount: 20,
            collectedCommentCount: 0,
            collectedRepostCount: 3,
            timeRangeStart: null,
            timeRangeEnd: null,
            samplingStrategy: 'recent+spikes',
          },
          behaviorTimeline: {
            postingByDay: [],
            postingByHour: [],
            interactionByDay: [],
            spikeMoments: [{ timestamp: '2026-04-23T00:00:00.000Z', reason: '日互动峰值 120' }],
            activePeriods: ['夜间活跃', '下午活跃'],
          },
          topicAndSentimentProfile: {
            topicClusters: [{ label: '体育', weight: 10, keywords: ['体育'] }],
            primaryKeywords: ['体育', '争议'],
            eventTypes: [{ type: 'sports', weight: 8 }],
            sentimentTrend: [],
            sentimentDistribution: { positive: 20, negative: 70, neutral: 10 },
            topicShiftMoments: [],
          },
          relationSummary: {
            topConnectedUsers: [{ userId: '200', weight: 15, relationTypes: ['repost'] }],
            relationTypes: [{ type: 'repost', count: 1 }],
            sharedEvents: [],
            relationClusters: [{ label: '高频互动群', members: ['200', '201'] }],
            suspiciousCoordinationHints: ['与多个用户存在高频互动，需检查协同传播'],
          },
          evidenceSamples: {
            eventSamples: [{ sourceId: 'p1', excerpt: '事件内样本', reason: '风险信号' }],
            historySamples: [{ sourceId: 'p2', excerpt: '历史样本', reason: '叙事风格' }],
            relationSamples: [{ sourceId: '200', excerpt: 'repost · 权重 15', reason: '关系强连接样本' }],
            nlpSamples: [{ sourceId: 'p3', excerpt: '文本片段 · 情绪 negative', reason: 'NLP 语义样本' }],
          },
          preDistillationSummary: {
            candidateLabels: ['体育', '争议'],
            anomalyHints: ['事件内高风险'],
            coverageWarnings: ['存在协同传播迹象'],
            humanReviewNeeded: true,
          },
        }}
      />,
    );

    expect(screen.getByText('夜间活跃')).toBeInTheDocument();
    expect(screen.getByText('负向 70')).toBeInTheDocument();
    expect(screen.getByText('与多个用户存在高频互动，需检查协同传播')).toBeInTheDocument();
  });
});
