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
      },
    ]);

    const result = await service.getQueue({ page: 1, pageSize: 20 });

    expect(result.items[0]?.weiboUserId).toBe('100');
    expect(result.items[0]?.status).toBe('queued');
    expect(result.items[1]?.hasPersona).toBe(true);
  });
});
