import { describe, expect, it } from 'vitest';
import { PersonaNetworkService } from './persona-network.service';

describe('PersonaNetworkService', () => {
  it('returns persona-level edges instead of raw memory nodes', async () => {
    const service = new PersonaNetworkService();
    const graph = await service.buildGraph({
      personas: [{
        personaId: 'p1',
        weiboUserId: '100',
        name: '用户A',
        avatar: null,
        riskLevel: 'high',
        riskScore: 87,
        traits: ['热点追逐'],
        memoryCount: 4,
        lastDistilledAt: null,
      }],
      edges: [{
        id: 'e1',
        sourcePersonaId: 'p1',
        targetPersonaId: 'p2',
        edgeType: 'interaction',
        weight: 9,
        reason: '高频互动',
      }],
    });

    expect(graph.personas).toHaveLength(1);
    expect(graph.edges[0]?.edgeType).toBe('interaction');
  });
});
