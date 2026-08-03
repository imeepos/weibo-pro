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

describe('distilled user profile - v2 wiki memory drafts', () => {
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

  it('uses llm wiki prompt conventions in v2 distillation', async () => {
    structuredInvokeMock.mockResolvedValue({
      ...validProfile,
      memoryDrafts: [{
        ...validProfile.memoryDrafts[0],
        section: 'identity',
        isSectionHub: false,
        stability: 'stable',
      }],
    });

    const service = new UserProfileDistillationService();

    await service.distill(validDossier as any);

    const [messages] = structuredInvokeMock.mock.calls.at(-1)!;
    expect(messages[0].content).toContain('raw source layer');
    expect(messages[0].content).toContain('wiki layer');
    expect(messages[0].content).toContain('evidence-first');
  });

  it('keeps valid memory drafts when one llm wiki draft is malformed', async () => {
    structuredInvokeMock.mockRejectedValue(
      new SyntaxError('Unexpected token `, "```json\\n{\\n"... is not valid JSON'),
    );
    fallbackInvokeMock.mockResolvedValue({
      ...validProfile,
      memoryDrafts: [
        {
          ...validProfile.memoryDrafts[0],
          section: 'identity',
          isSectionHub: false,
          stability: 'stable',
        },
        {
          type: 'insight',
          name: '',
          description: null,
          content: '',
          evidenceRefs: [],
          relationDrafts: [],
          section: 'risk',
        },
      ],
    });

    const service = new UserProfileDistillationService();

    const profile = await service.distill(validDossier as any);

    expect(profile.memoryDrafts).toHaveLength(1);
    expect((profile.memoryDrafts[0] as any)?.section).toBe('identity');
  });
});
