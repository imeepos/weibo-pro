import { describe, expect, it, vi } from 'vitest';
import { UserDossierService } from './user-dossier.service';

describe('UserDossierService', () => {
  it('builds a structured dossier with account snapshot, coverage, samples, and relation summary', async () => {
    const service = new UserDossierService();
    service['loadAccountSnapshot'] = vi.fn().mockResolvedValue({
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
    });
    service['loadEvidenceSamples'] = vi.fn().mockResolvedValue({
      eventSamples: [{ sourceId: 'p1', excerpt: '事件内样本', reason: '风险信号' }],
      historySamples: [{ sourceId: 'p2', excerpt: '历史样本', reason: '叙事风格' }],
      relationSamples: [],
      nlpSamples: [],
    });

    const result = await service.getDossier('100', { windowDays: 90 });

    expect(result.accountSnapshot.weiboUserId).toBe('100');
    expect(result.evidenceSamples.eventSamples).toHaveLength(1);
    expect(result.historyCoverage.windowDays).toBe(90);
  });
});
