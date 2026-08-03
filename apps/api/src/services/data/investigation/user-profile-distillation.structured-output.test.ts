import { beforeEach, describe, expect, it, vi } from 'vitest';
import { distilledUserProfileSchema } from './user-profile-distillation.schema';
import { UserProfileDistillationService } from './user-profile-distillation.service';
import { useLlmModel } from '@sker/workflow-run';
import { validProfile, validDossier } from './__fixtures__/user-profile-distillation.fixtures';

const fallbackInvokeMock = vi.fn();
const structuredInvokeMock = vi.fn();
const withStructuredOutputMock = vi.fn();

vi.mock('@sker/workflow-run', () => ({
  useLlmModel: vi.fn(),
}));

describe('distilled user profile - structured output path', () => {
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

  it('uses structured output when the model supports it', async () => {
    structuredInvokeMock.mockResolvedValue(validProfile);

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(withStructuredOutputMock).toHaveBeenCalledWith(distilledUserProfileSchema);
    expect(profile.summary.short).toBe('短摘要');
    expect(profile.memoryDrafts[0]?.type).toBe('insight');
    expect(fallbackInvokeMock).not.toHaveBeenCalled();
  });

  it('falls back to plain invoke when structured output parsing throws before reaching the service parser', async () => {
    structuredInvokeMock.mockRejectedValue(
      new SyntaxError('Unexpected token `, "```json\\n{\\n"... is not valid JSON'),
    );
    fallbackInvokeMock.mockResolvedValue({
      content: `\`\`\`json
${JSON.stringify(validProfile, null, 2)}
\`\`\``,
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.summary.short).toBe('短摘要');
    expect(structuredInvokeMock).toHaveBeenCalledTimes(1);
    expect(fallbackInvokeMock).toHaveBeenCalledTimes(1);
  });

  it('returns a dossier-based fallback profile when provider invocation still fails', async () => {
    structuredInvokeMock.mockRejectedValue(
      new SyntaxError('Unexpected token `, "```json\\n{\\n"... is not valid JSON'),
    );
    fallbackInvokeMock.mockRejectedValue(
      new Error("Cannot read properties of undefined (reading 'map')"),
    );

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.summary.short).toContain('自动蒸馏降级画像');
    expect(profile.risk.reviewRecommendation).toBe('human_review');
    expect(profile.metadata.sampledPosts).toBe(20);
    expect(profile.metadata.promptVersion).toContain('fallback');
    expect(profile.memoryDrafts.length).toBeGreaterThan(0);
  });
});
