/**
 * 用户档案(dossier)蒸馏前摘要构建模块。
 * 根据事件风险、历史覆盖、话题情绪、关系与样本等信号，
 * 生成候选标签、异常提示、覆盖警告与人工复核建议。
 */

import type { UserInvestigationDossier } from '@sker/sdk';

export interface PreDistillationSummaryInput {
  eventRiskContext: UserInvestigationDossier['eventRiskContext'];
  historyCoverage: UserInvestigationDossier['historyCoverage'];
  topicAndSentimentProfile: UserInvestigationDossier['topicAndSentimentProfile'];
  relationSummary: UserInvestigationDossier['relationSummary'];
  evidenceSamples: UserInvestigationDossier['evidenceSamples'];
}

export function buildPreDistillationSummary(
  input: PreDistillationSummaryInput,
): UserInvestigationDossier['preDistillationSummary'] {
  return {
    candidateLabels: input.topicAndSentimentProfile.primaryKeywords.slice(0, 3),
    anomalyHints: input.eventRiskContext.eventRiskScore >= 60 ? ['事件内高风险'] : [],
    coverageWarnings: [
      ...(input.historyCoverage.collectedPostCount === 0 ? ['历史帖子样本为空'] : []),
      ...(input.evidenceSamples.eventSamples.length === 0 ? ['事件样本不足，建议人工复核'] : []),
      ...(input.relationSummary.suspiciousCoordinationHints.length > 0 ? ['存在协同传播迹象'] : []),
    ],
    humanReviewNeeded:
      input.evidenceSamples.eventSamples.length === 0 ||
      input.relationSummary.suspiciousCoordinationHints.length > 0,
  };
}
