import type { EvidencePoolItem } from './user-profile-distillation.types';
import {
  asRecord,
  clampConfidence,
  compactStrings,
  firstNonEmptyString,
  firstNumber,
  shorten,
  toStringArray,
} from './user-profile-distillation.utils';

export function buildCoercedIdentity(record: Record<string, unknown>) {
  const identity = asRecord(record.identity);
  const tags = toStringArray(identity?.accountNature ?? identity?.tags);
  const stableTraits = toStringArray(identity?.stableTraits);
  const inferredRole =
    firstNonEmptyString(
      identity?.inferredRole,
      identity?.verifiedInfo,
      identity?.influenceLevel,
      identity?.handle,
    ) ?? '待人工研判';

  return {
    inferredRole,
    roleConfidence: clampConfidence(
      firstNumber(identity?.roleConfidence) ?? 0.6,
    ),
    accountNature: tags,
    stableTraits: stableTraits.length > 0 ? stableTraits : toStringArray(identity?.influenceLevel),
  };
}

export function buildCoercedBehavior(record: Record<string, unknown>) {
  const behavior = asRecord(record.behavior);

  return {
    activityPattern: compactStrings([
      ...toStringArray(behavior?.activityPattern),
      firstNonEmptyString(behavior?.postingFrequency),
      firstNonEmptyString(behavior?.activeHours),
    ]),
    postingRhythm:
      firstNonEmptyString(behavior?.postingRhythm, behavior?.postingFrequency) ?? 'unknown',
    escalationPattern: compactStrings([
      ...toStringArray(behavior?.escalationPattern),
      firstNonEmptyString(behavior?.interactionPattern),
      firstNonEmptyString(behavior?.anomaly),
    ]),
    historicalStability:
      firstNonEmptyString(behavior?.historicalStability, 'medium') ?? 'medium',
  };
}

export function buildCoercedContent(record: Record<string, unknown>) {
  const content = asRecord(record.content);

  return {
    primaryTopics: compactStrings([
      ...toStringArray(content?.primaryTopics),
      ...toStringArray(content?.primaryThemes),
    ]),
    narrativeStyles: compactStrings([
      ...toStringArray(content?.narrativeStyles),
      firstNonEmptyString(content?.style, content?.narrative),
    ]),
    emotionalTendency: compactStrings([
      ...toStringArray(content?.emotionalTendency),
      firstNonEmptyString(content?.sentiment),
    ]),
    stancePattern: compactStrings([
      ...toStringArray(content?.stancePattern),
      ...toStringArray(content?.keywords).slice(0, 3),
      ...toStringArray(content?.sensitiveKeywords).slice(0, 3),
    ]),
  };
}

export function buildRiskDrivers(risk: Record<string, unknown> | null) {
  if (!risk) {
    return [{ label: '待人工复核', reason: '模型返回结构异常，已降级兜底', confidence: 0.5 }];
  }

  const directDrivers = Array.isArray(risk.riskDrivers) ? risk.riskDrivers : [];
  const normalizedDirectDrivers = directDrivers
    .map((driver) => asRecord(driver))
    .filter((driver): driver is Record<string, unknown> => Boolean(driver))
    .map((driver) => ({
      label: firstNonEmptyString(driver.label, driver.reason) ?? '风险信号',
      reason: firstNonEmptyString(driver.reason, driver.label) ?? '待人工复核',
      confidence: clampConfidence(firstNumber(driver.confidence) ?? 0.6),
    }));

  if (normalizedDirectDrivers.length > 0) {
    return normalizedDirectDrivers;
  }

  const reasons = compactStrings([
    ...toStringArray(risk.reasons),
    ...toStringArray(risk.riskSignals),
  ]);
  if (reasons.length > 0) {
    return reasons.map((reason) => ({
      label: shorten(reason, 16),
      reason,
      confidence: 0.6,
    }));
  }

  return [{ label: '待人工复核', reason: '模型未返回标准风险驱动字段', confidence: 0.5 }];
}

export function buildCoercedRelations(record: Record<string, unknown>) {
  const relations = asRecord(record.relations);
  const interactionType =
    firstNonEmptyString(relations?.interactionType, 'interaction') ?? 'interaction';
  const assessment = firstNonEmptyString(relations?.assessment);
  const directKeyConnections = Array.isArray(relations?.keyConnections) ? relations.keyConnections : [];
  const normalizedDirectConnections = directKeyConnections
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      targetUserId: firstNonEmptyString(item.targetUserId) ?? 'unknown',
      relationType: firstNonEmptyString(item.relationType, interactionType) ?? interactionType,
      strength: Math.max(0, firstNumber(item.strength) ?? 1),
      note: firstNonEmptyString(item.note, assessment, interactionType) ?? interactionType,
    }));

  const stringKeyConnections = toStringArray(relations?.keyConnections).map((targetUserId) => ({
    targetUserId,
    relationType: interactionType,
    strength: 1,
    note: assessment ?? firstNonEmptyString(relations?.coordinationIndicators, interactionType) ?? interactionType,
  }));

  const closeCircleConnections = toStringArray(relations?.closeCircle).map((targetUserId) => ({
    targetUserId,
    relationType: interactionType,
    strength: 1,
    note:
      assessment ??
      firstNonEmptyString(relations?.coordinationIndicators, interactionType) ??
      interactionType,
  }));

  return {
    keyConnections:
      normalizedDirectConnections.length > 0
        ? normalizedDirectConnections
        : stringKeyConnections.length > 0
          ? stringKeyConnections
          : closeCircleConnections,
    clusterRole: firstNonEmptyString(relations?.clusterRole, assessment) ?? null,
    coordinationSignals: compactStrings([
      ...toStringArray(relations?.coordinationSignals),
      firstNonEmptyString(relations?.coordinationIndicators),
      assessment,
    ]),
  };
}

export function buildCoercedMemoryDrafts(
  record: Record<string, unknown>,
  evidencePool: EvidencePoolItem[],
) {
  const memoryDrafts = asRecord(record.memoryDrafts);
  const draftEntries = compactStrings([
    firstNonEmptyString(memoryDrafts?.keyObservations),
    firstNonEmptyString(memoryDrafts?.pendingTasks),
    firstNonEmptyString(memoryDrafts?.pendingInvestigation),
    ...toStringArray(memoryDrafts?.recentMilestones),
  ]);
  const entries =
    draftEntries.length > 0
      ? draftEntries
      : compactStrings([firstNonEmptyString(record.summary)]);
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
