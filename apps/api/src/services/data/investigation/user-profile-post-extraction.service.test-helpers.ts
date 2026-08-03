import { vi } from 'vitest';
import { useLlmModel } from '@sker/workflow-run';

export const plainInvokeMock = vi.fn<any>();
export const structuredInvokeMock = vi.fn<any>();
export const withStructuredOutputMock = vi.fn<any>();

export const extractionRepo = {
  findOne: vi.fn<any>(),
  create: vi.fn<any>((input: any) => input),
  save: vi.fn<any>(async (input: any) => input),
};

/**
 * 重置 LLM 相关 mock 并注入默认行为：
 * - withStructuredOutput 返回 { invoke: structuredInvokeMock }
 * - useLlmModel 返回 { invoke: plainInvokeMock, withStructuredOutput }
 */
export function setupUserProfilePostExtractionMocks() {
  plainInvokeMock.mockReset();
  structuredInvokeMock.mockReset();
  withStructuredOutputMock.mockReset();
  withStructuredOutputMock.mockReturnValue({
    invoke: structuredInvokeMock,
  });
  vi.mocked(useLlmModel).mockReturnValue({
    invoke: plainInvokeMock,
    withStructuredOutput: withStructuredOutputMock,
  } as any);
}

/** invokeExtractor 的完整解析结果（含 eventKey 等全部字段）。 */
export const fullExtractionPayload = {
  topicLabels: ['体育'],
  eventLabel: '赛事A',
  eventKey: 'event-a',
  viewpointLabels: ['支持'],
  stance: '支持',
  sentiment: 'positive',
  emotionLabels: ['激动'],
  entities: [],
  riskSignals: [],
  coordinationMarkers: [],
  temporalHints: {
    postCreatedAt: '2026-04-28T01:00:00.000Z',
    inferredPhase: 'burst',
  },
  contentFingerprint: 'fp-1',
  excerpt: '统一口径帖文',
};

/** 重新抽取时返回的默认解析结果。 */
export const successfulExtractionPayload = {
  topicLabels: ['新结果'],
  eventLabel: null,
  eventKey: null,
  viewpointLabels: ['中性'],
  stance: null,
  sentiment: 'neutral',
  emotionLabels: [],
  entities: [],
  riskSignals: [],
  coordinationMarkers: [],
  temporalHints: { postCreatedAt: null, inferredPhase: 'unknown' },
  contentFingerprint: 'fp-1',
  excerpt: '测试帖子',
};
