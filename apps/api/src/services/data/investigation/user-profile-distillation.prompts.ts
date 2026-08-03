import type { UserInvestigationDossier } from '@sker/sdk';

export interface AggregatedDistillationInput {
  dossier: UserInvestigationDossier;
  tree: any[];
  timeline: any[];
  coordinationSignals: any[];
  extractions: Array<Record<string, unknown>>;
}

export function buildPrompt(dossier: UserInvestigationDossier): string {
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

export function buildDistillationMessages(dossier: UserInvestigationDossier) {
  return [
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
      content: buildPrompt(dossier),
    },
  ];
}

export function buildAggregatedInputMessages(input: AggregatedDistillationInput) {
  return [
    {
      role: 'system',
      content: [
        '你负责基于逐帖抽取结果和时间行为聚合结果生成用户画像。',
        '输入中的 extractions 是逐帖 wiki layer，tree/timeline/signals 是聚合后的知识结构。',
        '你必须把时间脉冲、同质内容簇、疑似协同传播信号纳入 behavior/risk/relations。',
        '只能返回 JSON。',
      ].join('\n'),
    },
    {
      role: 'human',
      content: JSON.stringify(input),
    },
  ];
}
