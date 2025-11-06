import { Injectable } from '@sker/core';
import { NLPAnalyzer } from '@sker/nlp';
import type { OpinionTask, OpinionReport } from './types';

// 创建OpinionAgent专用的日志记录器
const logger = {
  info: (message: string, data?: any) => console.log(`[OpinionAgent] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[OpinionAgent] ${message}`, data || ''),
  error: (message: string, error?: any) => console.error(`[OpinionAgent] ${message}`, error || ''),
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[OpinionAgent] ${message}`, data || '');
    }
  }
};

@Injectable()
export class OpinionAgent {
  private static readonly SENSITIVE_KEYWORDS = ['投诉', '欺诈', '违法', '诈骗', '造假'];

  constructor(private nlp: NLPAnalyzer) {}

  async analyze(task: OpinionTask): Promise<OpinionReport> {
    logger.info('舆情分析任务开始', { taskId: task.id });

    try {
      logger.debug('开始NLP分析');
      const analysis = await this.nlp.analyze(task.context);
      logger.debug('NLP分析完成', {
        sentiment: analysis.sentiment,
        keywordCount: analysis.keywords.length
      });

      logger.debug('计算情感趋势');
      const trend = this.calculateTrend(task.history, analysis.sentiment);
      logger.debug('情感趋势计算完成', { direction: trend.direction, magnitude: trend.magnitude });

      logger.debug('评估风险等级');
      const risk = this.assessRisk(analysis, trend);
      logger.debug('风险评估完成', { level: risk.level, score: risk.score });

      const report = {
        taskId: task.id,
        analysis,
        trend,
        risk,
        timestamp: Date.now(),
      };

      logger.info('舆情分析任务完成', {
        taskId: task.id,
        riskLevel: risk.level,
        trendDirection: trend.direction
      });

      return report;
    } catch (error) {
      logger.error('舆情分析任务失败', { taskId: task.id, error });
      throw error;
    }
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
