import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfilePostExtractionService } from './user-profile-post-extraction.service';
import {
  plainInvokeMock,
  structuredInvokeMock,
  withStructuredOutputMock,
  setupUserProfilePostExtractionMocks,
  fullExtractionPayload,
} from './user-profile-post-extraction.service.test-helpers';

vi.mock('@sker/workflow-run', () => ({
  useLlmModel: vi.fn(),
}));

describe('UserProfilePostExtractionService.invokeExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUserProfilePostExtractionMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers plain invoke and parses fenced json responses without falling back to structured output', async () => {
    plainInvokeMock.mockResolvedValue({
      content: `\`\`\`json
${JSON.stringify(fullExtractionPayload, null, 2)}
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
    structuredInvokeMock.mockResolvedValue(fullExtractionPayload);

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
