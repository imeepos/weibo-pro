import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfileDistillationService } from './user-profile-distillation.service';
import { useLlmModel } from '@sker/workflow-run';
import {
  validDossier,
  alternativeProviderProfile,
  secondAlternativeProviderProfile,
} from './__fixtures__/user-profile-distillation.fixtures';

const fallbackInvokeMock = vi.fn();
const structuredInvokeMock = vi.fn();
const withStructuredOutputMock = vi.fn();

vi.mock('@sker/workflow-run', () => ({
  useLlmModel: vi.fn(),
}));

describe('distilled user profile - provider schema coercion', () => {
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

  it('coerces common plain-invoke provider schemas into the investigation profile schema', async () => {
    structuredInvokeMock.mockRejectedValue(
      new SyntaxError('Unexpected token `, "```json\\n{\\n"... is not valid JSON'),
    );
    fallbackInvokeMock.mockResolvedValue({
      content: `\`\`\`json
${JSON.stringify(alternativeProviderProfile, null, 2)}
\`\`\``,
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.summary.short).toContain('高影响力认证账号');
    expect(profile.identity.inferredRole).toContain('北京大学中文系教授');
    expect(profile.risk.overallLevel).toBe('medium');
    expect(profile.risk.reviewRecommendation).toBe('human_review');
    expect(profile.memoryDrafts).toHaveLength(2);
    expect(profile.memoryDrafts[0]?.evidenceRefs.length).toBeGreaterThan(0);
    expect(profile.metadata.sampledPosts).toBe(774);
    expect(profile.metadata.windowDays).toBe(90);
  });

  it('coerces nested provider summary and milestone schemas into the investigation profile schema', async () => {
    structuredInvokeMock.mockRejectedValue(
      new SyntaxError('Unexpected token `, "```json\\n{\\n"... is not valid JSON'),
    );
    fallbackInvokeMock.mockResolvedValue({
      content: `\`\`\`json
${JSON.stringify(secondAlternativeProviderProfile, null, 2)}
\`\`\``,
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.summary.long).toContain('涉政敏感话题讨论倾向');
    expect(profile.risk.overallLevel).toBe('medium');
    expect(profile.memoryDrafts.length).toBeGreaterThan(0);
    expect(profile.memoryDrafts.some((item) => item.content.includes('2026-04-17'))).toBe(true);
    expect(profile.relations.keyConnections[0]?.targetUserId).toBe('7930521683');
    expect(profile.metadata.sampledPosts).toBe(903);
  });
});
