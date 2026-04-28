import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfilePostExtractionService } from './user-profile-post-extraction.service';
import { useLlmModel } from '@sker/workflow-run';

const plainInvokeMock = vi.fn();
const structuredInvokeMock = vi.fn();
const withStructuredOutputMock = vi.fn();

vi.mock('@sker/workflow-run', () => ({
  useLlmModel: vi.fn(),
}));

describe('UserProfilePostExtractionService', () => {
  const extractionRepo = {
    findOne: vi.fn(),
    create: vi.fn((input) => input),
    save: vi.fn(async (input) => input),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reuses an existing succeeded extraction with the same fingerprint and version', async () => {
    extractionRepo.findOne.mockResolvedValue({
      id: 'ex-1',
      extractor_version: 'post-v1',
      status: 'succeeded',
      extracted_json: { contentFingerprint: 'fp-1', topicLabels: ['体育'] },
    });

    const service = new UserProfilePostExtractionService();
    (service as any).extractionRepo = extractionRepo;
    const result = await service.resolveExtraction({
      sourcePostId: 'source-1',
      weiboUserId: '100',
      extractorVersion: 'post-v1',
      fingerprint: 'fp-1',
      normalizedText: '测试帖子',
      sourceSnapshot: { text: '测试帖子' },
    });

    expect(result.reused).toBe(true);
    expect(result.record.extracted_json?.topicLabels).toEqual(['体育']);
    expect(extractionRepo.save).not.toHaveBeenCalled();
  });

  it('re-extracts when extractor version changes', async () => {
    extractionRepo.findOne.mockResolvedValue({
      id: 'ex-1',
      extractor_version: 'post-v0',
      status: 'succeeded',
      extracted_json: { contentFingerprint: 'fp-1', topicLabels: ['旧结果'] },
    });

    const service = new UserProfilePostExtractionService();
    (service as any).extractionRepo = extractionRepo;
    vi.spyOn(service as any, 'invokeExtractor').mockResolvedValue({
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
    });

    const result = await service.resolveExtraction({
      sourcePostId: 'source-1',
      weiboUserId: '100',
      extractorVersion: 'post-v1',
      fingerprint: 'fp-1',
      normalizedText: '测试帖子',
      sourceSnapshot: { text: '测试帖子' },
    });

    expect(result.reused).toBe(false);
    expect(result.record.status).toBe('succeeded');
    expect(result.record.extracted_json?.topicLabels).toEqual(['新结果']);
  });

  it('summarizes batch extraction counts for reuse success and failure', async () => {
    vi.stubEnv('USER_PROFILE_POST_EXTRACTION_RETRY_LIMIT', '0');

    const service = new UserProfilePostExtractionService();
    (service as any).extractionRepo = extractionRepo;

    vi.spyOn(service, 'resolveExtraction').mockResolvedValueOnce({
      reused: true,
      record: { status: 'succeeded', extracted_json: { topicLabels: ['旧结果'] } },
    } as any);
    vi.spyOn(service, 'resolveExtraction').mockResolvedValueOnce({
      reused: false,
      record: { status: 'succeeded', extracted_json: { topicLabels: ['新结果'] } },
    } as any);
    vi.spyOn(service, 'resolveExtraction').mockResolvedValueOnce({
      reused: false,
      record: { status: 'failed', extracted_json: null, error_message: 'timeout' },
    } as any);

    const result = await service.extractForUser({
      taskId: 'task-1',
      weiboUserId: '100',
      sourcePosts: [
        {
          id: 'source-1',
          content_fingerprint: 'fp-1',
          normalized_text: '旧帖',
          source_snapshot: {},
        },
        {
          id: 'source-2',
          content_fingerprint: 'fp-2',
          normalized_text: '新帖',
          source_snapshot: {},
        },
        {
          id: 'source-3',
          content_fingerprint: 'fp-3',
          normalized_text: '失败帖',
          source_snapshot: {},
        },
      ],
    });

    expect(result.total).toBe(3);
    expect(result.reusedCount).toBe(1);
    expect(result.extractedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.warnings).toContain('帖子 source-3 提取失败：timeout');
  });

  it('reports incremental progress after each extracted post', async () => {
    vi.stubEnv('USER_PROFILE_POST_EXTRACTION_RETRY_LIMIT', '0');

    const service = new UserProfilePostExtractionService();
    (service as any).extractionRepo = extractionRepo;
    const onProgress = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(service, 'resolveExtraction').mockResolvedValueOnce({
      reused: true,
      record: { status: 'succeeded', extracted_json: { topicLabels: ['旧结果'] } },
    } as any);
    vi.spyOn(service, 'resolveExtraction').mockResolvedValueOnce({
      reused: false,
      record: { status: 'failed', extracted_json: null, error_message: 'timeout' },
    } as any);

    await service.extractForUser({
      taskId: 'task-1',
      weiboUserId: '100',
      sourcePosts: [
        {
          id: 'source-1',
          content_fingerprint: 'fp-1',
          normalized_text: '旧帖',
          source_snapshot: {},
        },
        {
          id: 'source-2',
          content_fingerprint: 'fp-2',
          normalized_text: '失败帖',
          source_snapshot: {},
        },
      ],
      onProgress,
    } as any);

    const completedCalls = onProgress.mock.calls
      .map(([progress]) => progress)
      .filter((progress) => progress.phase === 'completed');

    expect(completedCalls).toHaveLength(2);
    expect(completedCalls[0]).toEqual(
      expect.objectContaining({
        processedCount: 1,
        total: 2,
        reusedCount: 1,
        extractedCount: 0,
        failedCount: 0,
      }),
    );
    expect(completedCalls[1]).toEqual(
      expect.objectContaining({
        processedCount: 2,
        total: 2,
        reusedCount: 1,
        extractedCount: 0,
        failedCount: 1,
        latestWarning: '帖子 source-2 提取失败：timeout',
      }),
    );
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'active',
        message: '正在抽取第 1/2 条帖子（第 1/1 次尝试）',
      }),
    );
    expect(
      onProgress.mock.calls.some(
        ([progress]) =>
          progress.phase === 'active' &&
          progress.message === '正在抽取第 2/2 条帖子（第 1/1 次尝试）',
      ),
    ).toBe(true);
  });

  it('retries retryable extraction failures before marking a post as failed', async () => {
    vi.stubEnv('USER_PROFILE_POST_EXTRACTION_RETRY_LIMIT', '1');

    const service = new UserProfilePostExtractionService();
    (service as any).extractionRepo = extractionRepo;
    const onProgress = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(service, 'resolveExtraction')
      .mockResolvedValueOnce({
        reused: false,
        record: { status: 'failed', extracted_json: null, error_message: '帖子抽取超时（>30s）' },
      } as any)
      .mockResolvedValueOnce({
        reused: false,
        record: { status: 'succeeded', extracted_json: { topicLabels: ['重试成功'] } },
      } as any);

    const result = await service.extractForUser({
      taskId: 'task-1',
      weiboUserId: '100',
      sourcePosts: [
        {
          id: 'source-1',
          content_fingerprint: 'fp-1',
          normalized_text: '需要重试的帖子',
          source_snapshot: {},
        },
      ],
      onProgress,
    } as any);

    expect(service.resolveExtraction).toHaveBeenCalledTimes(2);
    expect(result.extractedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.warnings).toEqual([]);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        processedCount: 0,
        extractedCount: 0,
        failedCount: 0,
        message: '帖子 source-1 抽取失败，准备第 2/2 次重试',
        phase: 'retrying',
      }),
    );
  });

  it('prefers plain invoke and parses fenced json responses without falling back to structured output', async () => {
    plainInvokeMock.mockResolvedValue({
      content: `\`\`\`json
${JSON.stringify({
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
}, null, 2)}
\`\`\``,
    });

    const service = new UserProfilePostExtractionService();
    const result = await (service as any).invokeExtractor({
      normalizedText: '统一口径帖文',
      fingerprint: 'fp-1',
      sourceSnapshot: { text: '统一口径帖文' },
    });

    expect(result.topicLabels).toEqual(['体育']);
    expect(result.contentFingerprint).toBe('fp-1');
    expect(plainInvokeMock).toHaveBeenCalledTimes(1);
    expect(withStructuredOutputMock).not.toHaveBeenCalled();
  });

  it('falls back to structured output when the plain model client throws a transient type error', async () => {
    plainInvokeMock.mockRejectedValue(
      new TypeError("Cannot read properties of undefined (reading 'message')"),
    );
    structuredInvokeMock.mockResolvedValue({
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
    });

    const service = new UserProfilePostExtractionService();
    const result = await (service as any).invokeExtractor({
      normalizedText: '统一口径帖文',
      fingerprint: 'fp-1',
      sourceSnapshot: { text: '统一口径帖文' },
    });

    expect(result.eventKey).toBe('event-a');
    expect(plainInvokeMock).toHaveBeenCalledTimes(1);
    expect(withStructuredOutputMock).toHaveBeenCalledTimes(1);
    expect(structuredInvokeMock).toHaveBeenCalledTimes(1);
  });
});
