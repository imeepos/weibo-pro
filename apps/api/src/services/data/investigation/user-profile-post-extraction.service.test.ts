import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfilePostExtractionService } from './user-profile-post-extraction.service';

describe('UserProfilePostExtractionService', () => {
  const extractionRepo = {
    findOne: vi.fn(),
    create: vi.fn((input) => input),
    save: vi.fn(async (input) => input),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reuses an existing succeeded extraction with the same fingerprint and version', async () => {
    extractionRepo.findOne.mockResolvedValue({
      id: 'ex-1',
      extractor_version: 'post-v1',
      status: 'succeeded',
      extracted_json: { contentFingerprint: 'fp-1', topicLabels: ['体育'] },
    });

    const service = new UserProfilePostExtractionService(extractionRepo as any);
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

    const service = new UserProfilePostExtractionService(extractionRepo as any);
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
    const service = new UserProfilePostExtractionService(extractionRepo as any);

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
});
