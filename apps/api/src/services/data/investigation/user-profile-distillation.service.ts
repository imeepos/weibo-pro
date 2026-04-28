import { Injectable } from '@sker/core';
import type { DistilledUserProfile } from '@sker/sdk';
import { distilledUserProfileSchema } from './user-profile-distillation.schema';
import type { UserInvestigationDossier } from '@sker/sdk';
import { useLlmModel } from '@sker/workflow-run';

@Injectable({ providedIn: 'root' })
export class UserProfileDistillationService {
  validateProfile(payload: unknown): DistilledUserProfile {
    return distilledUserProfileSchema.parse(payload) as DistilledUserProfile;
  }

  async distill(
    dossier: UserInvestigationDossier,
    options: { model?: string; temperature?: number } = {},
  ): Promise<DistilledUserProfile> {
    const model = useLlmModel({
      model: options.model ?? 'deepseek-ai/DeepSeek-V3.2',
      temperature: options.temperature ?? 0.2,
    });

    const messages = [
      {
        role: 'system',
        content: [
          '你是微博高危用户研判专家。',
          '请根据输入的结构化 dossier 输出一个 JSON。',
          '只能返回 JSON，不要添加解释、标题或 Markdown 之外的文本。',
          '输出必须包含 summary、identity、behavior、content、risk、relations、memoryDrafts、metadata。',
        ].join('\n'),
      },
      {
        role: 'human',
        content: this.buildPrompt(dossier),
      },
    ];

    if (typeof (model as any).withStructuredOutput === 'function') {
      const structuredModel = (model as any).withStructuredOutput(distilledUserProfileSchema);
      const response = await structuredModel.invoke(messages);
      return this.normalizeProfileResponse(response);
    }

    const response = await model.invoke(messages);

    return this.normalizeProfileResponse(response);
  }

  private buildPrompt(dossier: UserInvestigationDossier): string {
    return JSON.stringify(
      {
        accountSnapshot: dossier.accountSnapshot,
        eventRiskContext: dossier.eventRiskContext,
        historyCoverage: dossier.historyCoverage,
        behaviorTimeline: dossier.behaviorTimeline,
        topicAndSentimentProfile: dossier.topicAndSentimentProfile,
        relationSummary: dossier.relationSummary,
        evidenceSamples: dossier.evidenceSamples,
        preDistillationSummary: dossier.preDistillationSummary,
      },
      null,
      2,
    );
  }

  private normalizeProfileResponse(response: unknown): DistilledUserProfile {
    if (typeof response === 'string') {
      return this.parseProfileResponse(response);
    }

    const textContent = this.extractTextContent((response as { content?: unknown })?.content);
    if (textContent) {
      return this.parseProfileResponse(textContent);
    }

    return this.validateProfile(response);
  }

  private extractTextContent(content: unknown): string | null {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      const text = content
        .map((item) =>
          item && typeof item === 'object' && 'text' in item && typeof item.text === 'string'
            ? item.text
            : '',
        )
        .filter(Boolean)
        .join('\n');

      return text || null;
    }

    return null;
  }

  private parseProfileResponse(response: string): DistilledUserProfile {
    const raw = this.extractJsonPayload(response);
    return this.validateProfile(JSON.parse(raw));
  }

  private extractJsonPayload(response: string): string {
    const trimmed = response.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      return fenced[1].trim();
    }

    const withoutOpeningFence = trimmed.replace(/^```(?:json)?\s*/i, '');
    const withoutClosingFence = withoutOpeningFence.replace(/\s*```$/, '');
    const jsonStart = withoutClosingFence.indexOf('{');
    const jsonEnd = withoutClosingFence.lastIndexOf('}');

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      return withoutClosingFence.slice(jsonStart, jsonEnd + 1).trim();
    }

    return withoutClosingFence.trim();
  }
}
