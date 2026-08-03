import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfileDistillationService } from './user-profile-distillation.service';
import { useLlmModel } from '@sker/workflow-run';
import { validProfile, validDossier } from './__fixtures__/user-profile-distillation.fixtures';

const fallbackInvokeMock = vi.fn();
const structuredInvokeMock = vi.fn();
const withStructuredOutputMock = vi.fn();

vi.mock('@sker/workflow-run', () => ({
  useLlmModel: vi.fn(),
}));

describe('distilled user profile - aggregated wiki-layer input', () => {
  beforeEach(() => {
    fallbackInvokeMock.mockReset();
    structuredInvokeMock.mockReset();
    withStructuredOutputMock.mockReset();

    withStructuredOutputMock.mockReturnValue({
      invoke: structuredInvokeMock,
    });

    vi.mocked(useLlmModel).mockReturnValue({
      invoke: fallbackInvokeMock,
      withStructuredOutput: withStructuredOutputMock,
    } as any);
  });

  it('distills from aggregated wiki-layer input with the v3 prompt contract', async () => {
    structuredInvokeMock.mockReset();
    withStructuredOutputMock.mockReset();
    fallbackInvokeMock.mockResolvedValue(JSON.stringify(validProfile));

    const service = new UserProfileDistillationService();
    const profile = await service.distillFromAggregatedInput({
      dossier: validDossier as any,
      tree: [{ id: 'event-1', kind: 'event_cluster', label: '事件A' }],
      timeline: [
        {
          bucketStart: '2026-04-28T01:00:00.000Z',
          bucketEnd: '2026-04-28T01:05:00.000Z',
          postCount: 2,
          sameContentCount: 2,
          eventCount: 1,
        },
      ],
      coordinationSignals: [
        {
          id: 'signal-1',
          label: '疑似协同传播',
          level: 'medium',
          eventKey: 'event-a',
          timeRange: {
            startAt: '2026-04-28T01:00:00.000Z',
            endAt: '2026-04-28T01:05:00.000Z',
          },
          relatedPostCount: 2,
          description: '同一事件窗口内发现 2 条高同质内容',
        },
      ],
      extractions: [
        {
          topicLabels: ['赛事'],
          eventLabel: '事件A',
          eventKey: 'event-a',
          viewpointLabels: ['支持'],
          stance: '支持',
          sentiment: 'positive',
          emotionLabels: ['激动'],
          entities: [],
          riskSignals: [],
          coordinationMarkers: ['same-template'],
          temporalHints: {
            postCreatedAt: '2026-04-28T01:00:00.000Z',
            inferredPhase: 'burst',
          },
          contentFingerprint: 'fp-1',
          excerpt: '支持某事件的统一口径',
        },
      ],
    });

    expect(profile.metadata.promptVersion).toBe('v3');
    expect(fallbackInvokeMock).toHaveBeenCalled();
  });
});
