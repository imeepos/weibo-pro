import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfilePostExtractionService } from './user-profile-post-extraction.service';
import {
  extractionRepo,
  setupUserProfilePostExtractionMocks,
} from './user-profile-post-extraction.service.test-helpers';

vi.mock('@sker/workflow-run', () => ({
  useLlmModel: vi.fn(),
}));

describe('UserProfilePostExtractionService.extractForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUserProfilePostExtractionMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
});
