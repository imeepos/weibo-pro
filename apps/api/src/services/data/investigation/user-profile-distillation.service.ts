import { Injectable } from '@sker/core';
import type { DistilledUserProfile } from '@sker/sdk';
import { distilledMemoryDraftSchema, distilledUserProfileSchema } from './user-profile-distillation.schema';
import type { UserInvestigationDossier } from '@sker/sdk';
import { useLlmModel } from '@sker/workflow-run';
import {
  inferMemorySection,
  isLlmWikiSection,
  normalizeLlmWikiStability,
} from './llm-wiki-memory-organization';

interface ProfileNormalizationContext {
  dossier: UserInvestigationDossier;
  promptVersion: string;
  requestedModel: string;
}

@Injectable({ providedIn: 'root' })
export class UserProfileDistillationService {
  validateProfile(payload: unknown): DistilledUserProfile {
    return distilledUserProfileSchema.parse(payload) as DistilledUserProfile;
  }

  async distill(
    dossier: UserInvestigationDossier,
    options: { model?: string; temperature?: number } = {},
  ): Promise<DistilledUserProfile> {
    const requestedModel = options.model ?? 'deepseek-ai/DeepSeek-V3.2';
    const promptVersion = 'v2';
    const normalizationContext: ProfileNormalizationContext = {
      dossier,
      promptVersion,
      requestedModel,
    };
    const model = useLlmModel({
      model: requestedModel,
      temperature: options.temperature ?? 0.2,
    });

    const messages = [
      {
        role: 'system',
        content: [
          '你是微博高危用户研判专家，同时负责按 LLM Wiki 方法整理用户知识画像。',
          '输入 dossier 是 raw source layer，输出 JSON 是 wiki layer。',
          '每条 memory 必须 evidence-first、尽量去重，并归入 identity/behavior/content/risk/relations 之一。',
          '若证据不足，使用 tentative；若证据冲突，使用 conflicted；不要编造。',
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
      try {
        const response = await structuredModel.invoke(messages);
        return this.normalizeProfileResponse(response, normalizationContext);
      } catch (error) {
        if (!this.isStructuredOutputParseFailure(error)) {
          throw error;
        }
      }
    }

    const response = await model.invoke(messages);

    return this.normalizeProfileResponse(response, normalizationContext);
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

  private normalizeProfileResponse(
    response: unknown,
    context: ProfileNormalizationContext,
  ): DistilledUserProfile {
    const directProfile = this.tryValidateProfile(response, context);
    if (directProfile) {
      return directProfile;
    }

    for (const candidate of this.collectProfileCandidates(response)) {
      if (typeof candidate === 'string') {
        const parsedProfile = this.tryParseProfileResponse(candidate, context);
        if (parsedProfile) {
          return parsedProfile;
        }
        continue;
      }

      const nestedProfile = this.tryValidateProfile(candidate, context);
      if (nestedProfile) {
        return nestedProfile;
      }
    }

    return this.validateProfile(response);
  }

  private tryValidateProfile(
    payload: unknown,
    context?: ProfileNormalizationContext,
  ): DistilledUserProfile | null {
    const result = distilledUserProfileSchema.safeParse(payload);
    if (result.success) {
      return context ? this.applyProfileDefaults(result.data as DistilledUserProfile, context) : (result.data as DistilledUserProfile);
    }

    if (!context) {
      return null;
    }

    const sanitizedProfile = this.tryNormalizeSchemaCompatibleProfile(payload, context);
    if (sanitizedProfile) {
      return sanitizedProfile;
    }

    return this.tryCoerceProfilePayload(payload, context);
  }

  private isStructuredOutputParseFailure(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message || '';
    const stack = error.stack || '';

    return (
      error instanceof SyntaxError ||
      /Unexpected token .* is not valid JSON/i.test(message) ||
      stack.includes('@langchain/openai/dist/utils/output.js')
    );
  }

  private parseProfileResponse(response: string): DistilledUserProfile {
    const parsedProfile = this.tryParseProfileResponse(response);
    if (parsedProfile) {
      return parsedProfile;
    }

    const [rawCandidate] = this.extractJsonPayloads(response);
    return this.validateProfile(JSON.parse(rawCandidate ?? response.trim()));
  }

  private tryParseProfileResponse(
    response: string,
    context?: ProfileNormalizationContext,
  ): DistilledUserProfile | null {
    for (const raw of this.extractJsonPayloads(response)) {
      try {
        const payload = JSON.parse(raw);
        const profile = this.tryValidateProfile(payload, context);
        if (profile) {
          return profile;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private tryCoerceProfilePayload(
    payload: unknown,
    context: ProfileNormalizationContext,
  ): DistilledUserProfile | null {
    if (!this.looksLikeAlternativeProfilePayload(payload)) {
      return null;
    }

    const record = payload as Record<string, unknown>;
    const risk = this.asRecord(record.risk);
    const metadata = this.asRecord(record.metadata);
    const summaryRecord = this.asRecord(record.summary);
    const summaryText = this.firstNonEmptyString(
      summaryRecord?.long,
      summaryRecord?.short,
      summaryRecord?.verdict,
      summaryRecord?.primaryThreat,
      record.summary,
    );
    const evidencePool = this.buildEvidencePool(context);

    const coercedProfile = {
      summary: {
        short: this.shorten(summaryText || '画像生成结果需要人工复核'),
        long: summaryText || '画像生成结果需要人工复核',
        confidence: this.clampConfidence(
          this.firstNumber(this.asRecord(record.summary)?.confidence, risk?.confidence) ?? 0.6,
        ),
      },
      identity: this.buildCoercedIdentity(record),
      behavior: this.buildCoercedBehavior(record),
      content: this.buildCoercedContent(record),
      risk: {
        overallLevel: this.normalizeRiskLevel(risk?.overallLevel ?? risk?.level, risk?.score),
        overallScore: this.normalizeRiskScore(risk?.overallScore ?? risk?.score),
        riskDrivers: this.buildRiskDrivers(risk),
        reviewRecommendation: this.normalizeReviewRecommendation(
          risk?.reviewRecommendation,
          risk?.score,
        ),
      },
      relations: this.buildCoercedRelations(record),
      memoryDrafts: this.buildCoercedMemoryDrafts(record, evidencePool),
      metadata: {
        sampledPosts: this.normalizeCount(
          metadata?.sampledPosts ?? metadata?.sampleSize,
          context.dossier.historyCoverage.collectedPostCount,
        ),
        sampledComments: this.normalizeCount(
          metadata?.sampledComments,
          context.dossier.historyCoverage.collectedCommentCount,
        ),
        sampledReposts: this.normalizeCount(
          metadata?.sampledReposts,
          context.dossier.historyCoverage.collectedRepostCount,
        ),
        windowDays: this.normalizeWindowDays(
          metadata?.windowDays ?? metadata?.dataWindow,
          context.dossier.historyCoverage.windowDays,
        ),
        model: this.firstNonEmptyString(metadata?.model, context.requestedModel) ?? context.requestedModel,
        promptVersion:
          this.firstNonEmptyString(metadata?.promptVersion, metadata?.modelVersion, context.promptVersion) ??
          context.promptVersion,
        generatedAt:
          this.firstNonEmptyString(metadata?.generatedAt, metadata?.analysisTime, metadata?.analyzedAt) ??
          new Date().toISOString(),
      },
    };

    const result = distilledUserProfileSchema.safeParse(coercedProfile);
    return result.success ? this.applyProfileDefaults(result.data as DistilledUserProfile, context) : null;
  }

  private tryNormalizeSchemaCompatibleProfile(
    payload: unknown,
    context: ProfileNormalizationContext,
  ): DistilledUserProfile | null {
    const record = this.asRecord(payload);
    if (!record || !Array.isArray(record.memoryDrafts)) {
      return null;
    }

    const normalizedMemoryDrafts = this.normalizeMemoryDrafts(record.memoryDrafts);
    if (normalizedMemoryDrafts.length === 0) {
      return null;
    }

    const candidate = {
      ...record,
      memoryDrafts: normalizedMemoryDrafts,
    };

    const result = distilledUserProfileSchema.safeParse(candidate);
    return result.success ? this.applyProfileDefaults(result.data as DistilledUserProfile, context) : null;
  }

  private applyProfileDefaults(
    profile: DistilledUserProfile,
    context: ProfileNormalizationContext,
  ): DistilledUserProfile {
    return {
      ...profile,
      memoryDrafts: this.normalizeMemoryDrafts(profile.memoryDrafts),
      metadata: {
        ...profile.metadata,
        model: profile.metadata.model || context.requestedModel,
        promptVersion: context.promptVersion,
        generatedAt: profile.metadata.generatedAt || new Date().toISOString(),
      },
    };
  }

  private normalizeMemoryDrafts(
    drafts: unknown[],
  ): DistilledUserProfile['memoryDrafts'] {
    return drafts.flatMap((draft) => {
      const record = this.asRecord(draft);
      if (!record) {
        return [];
      }

      const candidate = {
        ...record,
        section: this.normalizeSection(record.section, record),
        isSectionHub: Boolean(record.isSectionHub),
        stability: normalizeLlmWikiStability(record.stability),
      };

      const result = distilledMemoryDraftSchema.safeParse(candidate);
      return result.success ? [result.data] : [];
    }) as DistilledUserProfile['memoryDrafts'];
  }

  private normalizeSection(section: unknown, draft: Record<string, unknown>): 'identity' | 'behavior' | 'content' | 'risk' | 'relations' {
    if (isLlmWikiSection(section)) {
      return section;
    }

    return inferMemorySection({
      type: this.firstNonEmptyString(draft.type, 'insight') ?? 'insight',
      name: this.firstNonEmptyString(draft.name, '') ?? '',
      content: this.firstNonEmptyString(draft.content, '') ?? '',
    });
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

  private looksLikeAlternativeProfilePayload(payload: unknown): payload is Record<string, unknown> {
    const record = this.asRecord(payload);
    if (!record) {
      return false;
    }

    const identity = this.asRecord(record.identity);
    const behavior = this.asRecord(record.behavior);
    const risk = this.asRecord(record.risk);
    const metadata = this.asRecord(record.metadata);

    return Boolean(
      typeof record.summary === 'string' ||
        identity?.handle ||
        identity?.verifiedInfo ||
        behavior?.postingFrequency ||
        behavior?.activeHours ||
        risk?.level ||
        risk?.reasons ||
        metadata?.sampleSize ||
        metadata?.dataWindow,
    );
  }

  private buildCoercedIdentity(record: Record<string, unknown>) {
    const identity = this.asRecord(record.identity);
    const tags = this.toStringArray(identity?.accountNature ?? identity?.tags);
    const stableTraits = this.toStringArray(identity?.stableTraits);
    const inferredRole =
      this.firstNonEmptyString(
        identity?.inferredRole,
        identity?.verifiedInfo,
        identity?.influenceLevel,
        identity?.handle,
      ) ?? '待人工研判';

    return {
      inferredRole,
      roleConfidence: this.clampConfidence(
        this.firstNumber(identity?.roleConfidence) ?? 0.6,
      ),
      accountNature: tags,
      stableTraits: stableTraits.length > 0 ? stableTraits : this.toStringArray(identity?.influenceLevel),
    };
  }

  private buildCoercedBehavior(record: Record<string, unknown>) {
    const behavior = this.asRecord(record.behavior);

    return {
      activityPattern: this.compactStrings([
        ...this.toStringArray(behavior?.activityPattern),
        this.firstNonEmptyString(behavior?.postingFrequency),
        this.firstNonEmptyString(behavior?.activeHours),
      ]),
      postingRhythm:
        this.firstNonEmptyString(behavior?.postingRhythm, behavior?.postingFrequency) ?? 'unknown',
      escalationPattern: this.compactStrings([
        ...this.toStringArray(behavior?.escalationPattern),
        this.firstNonEmptyString(behavior?.interactionPattern),
        this.firstNonEmptyString(behavior?.anomaly),
      ]),
      historicalStability:
        this.firstNonEmptyString(behavior?.historicalStability, 'medium') ?? 'medium',
    };
  }

  private buildCoercedContent(record: Record<string, unknown>) {
    const content = this.asRecord(record.content);

    return {
      primaryTopics: this.compactStrings([
        ...this.toStringArray(content?.primaryTopics),
        ...this.toStringArray(content?.primaryThemes),
      ]),
      narrativeStyles: this.compactStrings([
        ...this.toStringArray(content?.narrativeStyles),
        this.firstNonEmptyString(content?.style, content?.narrative),
      ]),
      emotionalTendency: this.compactStrings([
        ...this.toStringArray(content?.emotionalTendency),
        this.firstNonEmptyString(content?.sentiment),
      ]),
      stancePattern: this.compactStrings([
        ...this.toStringArray(content?.stancePattern),
        ...this.toStringArray(content?.keywords).slice(0, 3),
        ...this.toStringArray(content?.sensitiveKeywords).slice(0, 3),
      ]),
    };
  }

  private buildRiskDrivers(risk: Record<string, unknown> | null) {
    if (!risk) {
      return [{ label: '待人工复核', reason: '模型返回结构异常，已降级兜底', confidence: 0.5 }];
    }

    const directDrivers = Array.isArray(risk.riskDrivers) ? risk.riskDrivers : [];
    const normalizedDirectDrivers = directDrivers
      .map((driver) => this.asRecord(driver))
      .filter((driver): driver is Record<string, unknown> => Boolean(driver))
      .map((driver) => ({
        label: this.firstNonEmptyString(driver.label, driver.reason) ?? '风险信号',
        reason: this.firstNonEmptyString(driver.reason, driver.label) ?? '待人工复核',
        confidence: this.clampConfidence(this.firstNumber(driver.confidence) ?? 0.6),
      }));

    if (normalizedDirectDrivers.length > 0) {
      return normalizedDirectDrivers;
    }

    const reasons = this.compactStrings([
      ...this.toStringArray(risk.reasons),
      ...this.toStringArray(risk.riskSignals),
    ]);
    if (reasons.length > 0) {
      return reasons.map((reason) => ({
        label: this.shorten(reason, 16),
        reason,
        confidence: 0.6,
      }));
    }

    return [{ label: '待人工复核', reason: '模型未返回标准风险驱动字段', confidence: 0.5 }];
  }

  private buildCoercedRelations(record: Record<string, unknown>) {
    const relations = this.asRecord(record.relations);
    const interactionType =
      this.firstNonEmptyString(relations?.interactionType, 'interaction') ?? 'interaction';
    const assessment = this.firstNonEmptyString(relations?.assessment);
    const directKeyConnections = Array.isArray(relations?.keyConnections) ? relations.keyConnections : [];
    const normalizedDirectConnections = directKeyConnections
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        targetUserId: this.firstNonEmptyString(item.targetUserId) ?? 'unknown',
        relationType: this.firstNonEmptyString(item.relationType, interactionType) ?? interactionType,
        strength: Math.max(0, this.firstNumber(item.strength) ?? 1),
        note: this.firstNonEmptyString(item.note, assessment, interactionType) ?? interactionType,
      }));

    const stringKeyConnections = this.toStringArray(relations?.keyConnections).map((targetUserId) => ({
      targetUserId,
      relationType: interactionType,
      strength: 1,
      note: assessment ?? this.firstNonEmptyString(relations?.coordinationIndicators, interactionType) ?? interactionType,
    }));

    const closeCircleConnections = this.toStringArray(relations?.closeCircle).map((targetUserId) => ({
      targetUserId,
      relationType: interactionType,
      strength: 1,
      note:
        assessment ??
        this.firstNonEmptyString(relations?.coordinationIndicators, interactionType) ??
        interactionType,
    }));

    return {
      keyConnections:
        normalizedDirectConnections.length > 0
          ? normalizedDirectConnections
          : stringKeyConnections.length > 0
            ? stringKeyConnections
            : closeCircleConnections,
      clusterRole: this.firstNonEmptyString(relations?.clusterRole, assessment) ?? null,
      coordinationSignals: this.compactStrings([
        ...this.toStringArray(relations?.coordinationSignals),
        this.firstNonEmptyString(relations?.coordinationIndicators),
        assessment,
      ]),
    };
  }

  private buildCoercedMemoryDrafts(
    record: Record<string, unknown>,
    evidencePool: Array<{ sourceTable: string; sourceId: string; excerpt?: string; score: number }>,
  ) {
    const memoryDrafts = this.asRecord(record.memoryDrafts);
    const draftEntries = this.compactStrings([
      this.firstNonEmptyString(memoryDrafts?.keyObservations),
      this.firstNonEmptyString(memoryDrafts?.pendingTasks),
      this.firstNonEmptyString(memoryDrafts?.pendingInvestigation),
      ...this.toStringArray(memoryDrafts?.recentMilestones),
    ]);
    const entries =
      draftEntries.length > 0
        ? draftEntries
        : this.compactStrings([this.firstNonEmptyString(record.summary)]);
    const uniqueEntries = Array.from(new Set(entries)).slice(0, 3);
    const fallbackEvidenceRef = evidencePool[0] ?? {
      sourceTable: 'weibo_posts',
      sourceId: 'unknown',
      score: 0.4,
    };

    return uniqueEntries.map((content, index) => ({
      type: 'insight' as const,
      name: index === 0 ? '关键观察' : `补充观察 ${index}`,
      description: null,
      content,
      evidenceRefs: [evidencePool[index] ?? fallbackEvidenceRef],
      relationDrafts: [],
    }));
  }

  private buildEvidencePool(context: ProfileNormalizationContext) {
    const samples = [
      ...context.dossier.evidenceSamples.historySamples.map((sample) => ({
        sourceTable: 'weibo_posts',
        sourceId: sample.sourceId,
        excerpt: sample.excerpt,
        score: 0.8,
      })),
      ...context.dossier.evidenceSamples.eventSamples.map((sample) => ({
        sourceTable: 'weibo_posts',
        sourceId: sample.sourceId,
        excerpt: sample.excerpt,
        score: 0.78,
      })),
      ...context.dossier.evidenceSamples.nlpSamples.map((sample) => ({
        sourceTable: 'weibo_posts',
        sourceId: sample.sourceId,
        excerpt: sample.excerpt,
        score: 0.72,
      })),
      ...context.dossier.evidenceSamples.relationSamples.map((sample) => ({
        sourceTable: 'user_relation_statistics',
        sourceId: sample.sourceId,
        excerpt: sample.excerpt,
        score: 0.65,
      })),
    ];

    return samples.slice(0, 5);
  }

  private normalizeRiskLevel(level: unknown, score: unknown): 'low' | 'medium' | 'high' | 'critical' {
    const normalizedLevel = this.firstNonEmptyString(level)?.toLowerCase();
    if (normalizedLevel) {
      if (normalizedLevel.includes('critical') || normalizedLevel.includes('极高')) {
        return 'critical';
      }
      if (normalizedLevel.includes('high') || normalizedLevel.includes('高')) {
        return 'high';
      }
      if (normalizedLevel.includes('medium') || normalizedLevel.includes('中')) {
        return 'medium';
      }
      if (normalizedLevel.includes('low') || normalizedLevel.includes('低')) {
        return 'low';
      }
    }

    const numericScore = this.normalizeRiskScore(score);
    if (numericScore >= 85) {
      return 'critical';
    }
    if (numericScore >= 70) {
      return 'high';
    }
    if (numericScore >= 40) {
      return 'medium';
    }
    return 'low';
  }

  private normalizeRiskScore(score: unknown): number {
    const numericScore = this.firstNumber(score);
    if (numericScore === null) {
      return 50;
    }

    return Math.max(0, Math.min(100, Math.round(numericScore)));
  }

  private normalizeReviewRecommendation(
    recommendation: unknown,
    score: unknown,
  ): 'auto_pass' | 'human_review' {
    const normalizedRecommendation = this.firstNonEmptyString(recommendation)?.toLowerCase();
    if (normalizedRecommendation === 'auto_pass') {
      return 'auto_pass';
    }
    if (normalizedRecommendation === 'human_review') {
      return 'human_review';
    }

    return this.normalizeRiskScore(score) >= 30 ? 'human_review' : 'auto_pass';
  }

  private normalizeCount(value: unknown, fallback: number): number {
    const numericValue = this.firstNumber(value);
    if (numericValue === null) {
      return Math.max(0, Math.round(fallback));
    }

    return Math.max(0, Math.round(numericValue));
  }

  private normalizeWindowDays(value: unknown, fallback: number): number {
    const numericValue = this.firstNumber(value);
    if (numericValue !== null && numericValue > 0) {
      return Math.round(numericValue);
    }

    const raw = this.firstNonEmptyString(value);
    const matchedDays = raw?.match(/(\d+)/);
    if (matchedDays?.[1]) {
      return Math.max(1, Number(matchedDays[1]));
    }

    return Math.max(1, Math.round(fallback));
  }

  private shorten(value: string, maxLength: number = 120): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 1).trim()}…`;
  }

  private clampConfidence(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private firstNonEmptyString(...values: unknown[]): string | null {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private firstNumber(...values: unknown[]): number | null {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
        return Number(value);
      }
    }

    return null;
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return this.compactStrings(
        value.map((item) => (typeof item === 'string' ? item : this.firstNonEmptyString(item))),
      );
    }

    const singleValue = this.firstNonEmptyString(value);
    return singleValue ? [singleValue] : [];
  }

  private compactStrings(values: Array<string | null | undefined>): string[] {
    return values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }
}
