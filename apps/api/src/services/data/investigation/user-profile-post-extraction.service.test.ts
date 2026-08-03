import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfilePostExtractionService } from './user-profile-post-extraction.service';
import {
  extractionRepo,
  setupUserProfilePostExtractionMocks,
  successfulExtractionPayload,
} from './user-profile-post-extraction.service.test-helpers';

vi.mock('@sker/workflow-run', () => ({
  useLlmModel: vi.fn(),
}));

describe('UserProfilePostExtractionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUserProfilePostExtractionMocks();
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
    vi.spyOn(service as any, 'invokeExtractor').mockResolvedValue(successfulExtractionPayload);

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
});
