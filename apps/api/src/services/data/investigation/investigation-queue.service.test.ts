import { describe, expect, it, vi } from 'vitest';
import { InvestigationQueueService } from './investigation-queue.service';

describe('InvestigationQueueService', () => {
  it('sorts candidates by event risk, task state, and persona status', async () => {
    const service = new InvestigationQueueService();
    service['fetchQueueRows'] = vi.fn().mockResolvedValue([
      {
        weiboUserId: '100',
        screenName: '用户A',
        avatar: null,
        eventRiskScore: 92,
        eventRiskLevel: 'high',
        taskStatus: 'queued',
        hasPersona: false,
        lastDistilledAt: null,
        riskSignals: ['情绪极化'],
        activityPostCount: 2,
        analyzedPostCount: 1,
      },
      {
        weiboUserId: '200',
        screenName: '用户B',
        avatar: null,
        eventRiskScore: 88,
        eventRiskLevel: 'high',
        taskStatus: 'published',
        hasPersona: true,
        lastDistilledAt: '2026-04-23T00:00:00.000Z',
        riskSignals: ['事件内高频出现'],
        activityPostCount: 2,
        analyzedPostCount: 1,
      },
    ]);

    const result = await service.getQueue({ page: 1, pageSize: 20 });

    expect(result.items[0]?.weiboUserId).toBe('100');
    expect(result.items[0]?.status).toBe('queued');
    expect(result.items[1]?.hasPersona).toBe(true);
  });

  it('excludes users without enough activity or usable NLP evidence', async () => {
    const service = new InvestigationQueueService();
    service['fetchQueueRows'] = vi.fn().mockResolvedValue([
      {
        weiboUserId: 'valid',
        screenName: '有效用户',
        avatar: null,
        eventRiskScore: 80,
        eventRiskLevel: 'high',
        taskStatus: 'queued',
        hasPersona: false,
        lastDistilledAt: null,
        riskSignals: [],
        activityPostCount: 2,
        analyzedPostCount: 1,
      },
      {
        weiboUserId: 'low-sample',
        screenName: '低样本用户',
        avatar: null,
        eventRiskScore: 0,
        eventRiskLevel: 'low',
        taskStatus: 'queued',
        hasPersona: false,
        lastDistilledAt: null,
        riskSignals: [],
        activityPostCount: 1,
        analyzedPostCount: 1,
      },
      {
        weiboUserId: 'no-evidence',
        screenName: '无证据用户',
        avatar: null,
        eventRiskScore: 0,
        eventRiskLevel: 'low',
        taskStatus: 'queued',
        hasPersona: false,
        lastDistilledAt: null,
        riskSignals: [],
        activityPostCount: 3,
        analyzedPostCount: 0,
      },
    ]);

    const result = await service.getQueue({ page: 1, pageSize: 20 });

    expect(result.items.map((item) => item.weiboUserId)).toEqual(['valid']);
    expect(result.total).toBe(1);
    expect(result.filteredCount).toBe(2);
    expect(result.coverageRate).toBe(33.3);
  });
});
