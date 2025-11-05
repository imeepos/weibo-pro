import { Injectable } from '@sker/core';
import { NLPAnalyzer } from '@sker/nlp';
import type { OpinionTask, OpinionReport } from './types';

@Injectable()
export class OpinionAgent {
  private static readonly SENSITIVE_KEYWORDS = ['投诉', '欺诈', '违法', '诈骗', '造假'];

  constructor(private nlp: NLPAnalyzer) {}

  async analyze(task: OpinionTask): Promise<OpinionReport> {
    const analysis = await this.nlp.analyze(task.context);

    const trend = this.calculateTrend(task.history, analysis.sentiment);

    const risk = this.assessRisk(analysis, trend);

    return {
      taskId: task.id,
      analysis,
      trend,
      risk,
      timestamp: Date.now(),
    };
  }

  private calculateTrend(history: any[], current: any) {
    if (history.length < 2) {
      return { direction: 'stable' as const, magnitude: 0 };
    }

    const recent = history.slice(-5).map((h) => h.sentiment.positive_prob);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const diff = current.positive_prob - avg;

    return {
      direction: (diff > 0.1 ? 'rising' : diff < -0.1 ? 'falling' : 'stable') as
        | 'rising'
        | 'falling'
        | 'stable',
      magnitude: Math.abs(diff),
    };
  }

  private assessRisk(analysis: any, trend: any) {
    let score = 0;

    if (analysis.sentiment.negative_prob > 0.6) score += 40;

    if (trend.direction === 'falling' && trend.magnitude > 0.2) score += 30;

    if (analysis.keywords.some((k: any) => OpinionAgent.SENSITIVE_KEYWORDS.includes(k.keyword))) {
      score += 30;
    }

    return {
      level: (score > 70 ? 'high' : score > 40 ? 'medium' : 'low') as
        | 'low'
        | 'medium'
        | 'high',
      score,
      reasons: this.buildRiskReasons(analysis, trend),
    };
  }

  private buildRiskReasons(analysis: any, trend: any): string[] {
    const reasons: string[] = [];

    if (analysis.sentiment.negative_prob > 0.6) {
      reasons.push(`负面情绪占比高 (${(analysis.sentiment.negative_prob * 100).toFixed(1)}%)`);
    }

    if (trend.direction === 'falling') {
      reasons.push(`情感趋势持续下滑 (幅度: ${(trend.magnitude * 100).toFixed(1)}%)`);
    }

    const foundSensitive = analysis.keywords.filter((k: any) =>
      OpinionAgent.SENSITIVE_KEYWORDS.includes(k.keyword)
    );
    if (foundSensitive.length > 0) {
      reasons.push(`包含敏感关键词: ${foundSensitive.map((k: any) => k.keyword).join('、')}`);
    }

    return reasons;
  }
}
