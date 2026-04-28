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
    const directProfile = this.tryValidateProfile(response);
    if (directProfile) {
      return directProfile;
    }

    for (const candidate of this.collectProfileCandidates(response)) {
      if (typeof candidate === 'string') {
        const parsedProfile = this.tryParseProfileResponse(candidate);
        if (parsedProfile) {
          return parsedProfile;
        }
        continue;
      }

      const nestedProfile = this.tryValidateProfile(candidate);
      if (nestedProfile) {
        return nestedProfile;
      }
    }

    return this.validateProfile(response);
  }

  private tryValidateProfile(payload: unknown): DistilledUserProfile | null {
    const result = distilledUserProfileSchema.safeParse(payload);
    return result.success ? (result.data as DistilledUserProfile) : null;
  }

  private parseProfileResponse(response: string): DistilledUserProfile {
    const parsedProfile = this.tryParseProfileResponse(response);
    if (parsedProfile) {
      return parsedProfile;
    }

    const [rawCandidate] = this.extractJsonPayloads(response);
    return this.validateProfile(JSON.parse(rawCandidate ?? response.trim()));
  }

  private tryParseProfileResponse(response: string): DistilledUserProfile | null {
    for (const raw of this.extractJsonPayloads(response)) {
      try {
        const payload = JSON.parse(raw);
        const profile = this.tryValidateProfile(payload);
        if (profile) {
          return profile;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private collectProfileCandidates(response: unknown): unknown[] {
    const candidates: unknown[] = [];
    this.appendProfileCandidates(response, candidates, new WeakSet<object>(), 0);
    return candidates;
  }

  private appendProfileCandidates(
    value: unknown,
    candidates: unknown[],
    seen: WeakSet<object>,
    depth: number,
  ): void {
    if (value == null || depth > 4 || candidates.length >= 24) {
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        candidates.push(trimmed);
      }
      return;
    }

    if (Array.isArray(value)) {
      const joinedText = this.extractTextFragments(value).join('\n').trim();
      if (joinedText) {
        candidates.push(joinedText);
      }

      for (const item of value) {
        this.appendProfileCandidates(item, candidates, seen, depth + 1);
        if (candidates.length >= 24) {
          return;
        }
      }

      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    if (seen.has(value)) {
      return;
    }
    seen.add(value);

    const record = value as Record<string, unknown>;
    const prioritizedKeys = [
      'parsed',
      'raw',
      'content',
      'text',
      'message',
      'output',
      'response',
      'completion',
      'data',
      'value',
    ];
    const visitedKeys = new Set<string>();

    for (const key of prioritizedKeys) {
      if (!(key in record)) {
        continue;
      }

      visitedKeys.add(key);
      this.appendProfileCandidates(record[key], candidates, seen, depth + 1);
      if (candidates.length >= 24) {
        return;
      }
    }

    const joinedText = this.extractTextFragments(record).join('\n').trim();
    if (joinedText) {
      candidates.push(joinedText);
    }

    for (const [key, nestedValue] of Object.entries(record)) {
      if (visitedKeys.has(key)) {
        continue;
      }

      this.appendProfileCandidates(nestedValue, candidates, seen, depth + 1);
      if (candidates.length >= 24) {
        return;
      }
    }
  }

  private extractTextFragments(value: unknown): string[] {
    if (typeof value === 'string') {
      return value.trim() ? [value] : [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.extractTextFragments(item));
    }

    if (!value || typeof value !== 'object') {
      return [];
    }

    const record = value as Record<string, unknown>;
    const fragments: string[] = [];

    if (typeof record.text === 'string' && record.text.trim()) {
      fragments.push(record.text);
    }
    if (typeof record.value === 'string' && record.value.trim()) {
      fragments.push(record.value);
    }
    if (typeof record.content === 'string' && record.content.trim()) {
      fragments.push(record.content);
    }

    return fragments;
  }

  private extractJsonPayloads(response: string): string[] {
    const normalized = response.replace(/^\uFEFF/, '').trim();
    if (!normalized) {
      return [];
    }

    const candidates: string[] = [normalized];
    const fenceRegex = /`{3,}\s*(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)\s*`{3,}/gi;

    for (const match of normalized.matchAll(fenceRegex)) {
      const content = match[1]?.trim();
      if (content) {
        candidates.push(content);
      }
    }

    const withoutFence = normalized
      .replace(/^`{3,}\s*(?:[a-zA-Z0-9_-]+)?\s*/i, '')
      .replace(/\s*`{3,}$/i, '')
      .trim();
    if (withoutFence) {
      candidates.push(withoutFence);
    }

    const balancedFromOriginal = this.extractBalancedJsonCandidate(normalized);
    if (balancedFromOriginal) {
      candidates.push(balancedFromOriginal);
    }

    if (withoutFence !== normalized) {
      const balancedWithoutFence = this.extractBalancedJsonCandidate(withoutFence);
      if (balancedWithoutFence) {
        candidates.push(balancedWithoutFence);
      }
    }

    return Array.from(
      new Set(
        candidates
          .map((candidate) => candidate.trim())
          .filter(Boolean),
      ),
    );
  }

  private extractBalancedJsonCandidate(text: string): string | null {
    const braceIndex = text.indexOf('{');
    const bracketIndex = text.indexOf('[');

    if (braceIndex === -1 && bracketIndex === -1) {
      return null;
    }

    const startsWithArray =
      bracketIndex !== -1 && (braceIndex === -1 || bracketIndex < braceIndex);
    const startIndex = startsWithArray ? bracketIndex : braceIndex;
    const openChar = startsWithArray ? '[' : '{';
    const closeChar = startsWithArray ? ']' : '}';

    let depth = 0;
    let inString = false;
    let escaping = false;

    for (let index = startIndex; index < text.length; index += 1) {
      const char = text[index];

      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === '\\' && inString) {
        escaping = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === openChar) {
        depth += 1;
        continue;
      }

      if (char === closeChar) {
        depth -= 1;
        if (depth === 0) {
          return text.slice(startIndex, index + 1).trim();
        }
      }
    }

    return null;
  }
}
