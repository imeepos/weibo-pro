import type { UserInvestigationDossier } from '@sker/sdk';
import { firstNonEmptyString, firstNumber } from './user-profile-distillation.utils';

export type NormalizedRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export function normalizeRiskLevel(level: unknown, score: unknown): NormalizedRiskLevel {
  const normalizedLevel = firstNonEmptyString(level)?.toLowerCase();
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

  const numericScore = normalizeRiskScore(score);
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

export function normalizeRiskScore(score: unknown): number {
  const numericScore = firstNumber(score);
  if (numericScore === null) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(numericScore)));
}

export function deriveDominantSentiment(dossier: UserInvestigationDossier): string {
  const distribution = dossier.topicAndSentimentProfile.sentimentDistribution;
  const ranking: Array<[string, number]> = [
    ['positive', Number(distribution.positive || 0)],
    ['negative', Number(distribution.negative || 0)],
    ['neutral', Number(distribution.neutral || 0)],
  ];
  ranking.sort((left, right) => right[1] - left[1]);
  return ranking[0]?.[0] ?? 'neutral';
}

export function normalizeReviewRecommendation(
  recommendation: unknown,
  score: unknown,
): 'auto_pass' | 'human_review' {
  const normalizedRecommendation = firstNonEmptyString(recommendation)?.toLowerCase();
  if (normalizedRecommendation === 'auto_pass') {
    return 'auto_pass';
  }
  if (normalizedRecommendation === 'human_review') {
    return 'human_review';
  }

  return normalizeRiskScore(score) >= 30 ? 'human_review' : 'auto_pass';
}

export function normalizeCount(value: unknown, fallback: number): number {
  const numericValue = firstNumber(value);
  if (numericValue === null) {
    return Math.max(0, Math.round(fallback));
  }

  return Math.max(0, Math.round(numericValue));
}

export function normalizeWindowDays(value: unknown, fallback: number): number {
  const numericValue = firstNumber(value);
  if (numericValue !== null && numericValue > 0) {
    return Math.round(numericValue);
  }

  const raw = firstNonEmptyString(value);
  const matchedDays = raw?.match(/(\d+)/);
  if (matchedDays?.[1]) {
    return Math.max(1, Number(matchedDays[1]));
  }

  return Math.max(1, Math.round(fallback));
}
