import { describe, it, expect } from 'vitest';

// 固定为 UTC，保证基于 getHours() 的分析可复现
process.env.TZ = 'UTC';

import {
  calculateStdDev,
  calculateTextSimilarity,
  extractSource,
  calculateTimeRegularity,
  calculateContentMechanical,
  analyzeTimeBehavior,
  analyzeContentFeatures,
  analyzeInteractionFeatures,
  analyzeDeviceSources,
} from '../tools/user-profile.analysis';
import { detectAbnormalSignals } from '../tools/user-profile.signals';

// ---------------------------------------------------------------------------
// 重构前（git HEAD）的原始实现，用于黄金对比验证重构未改变行为
// ---------------------------------------------------------------------------

function originalStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff =
    squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

function originalSimpleSimilarity(str1: string, str2: string): number {
  const tokens1 = new Set(str1.split(''));
  const tokens2 = new Set(str2.split(''));
  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  return intersection.size / union.size;
}

function originalTextSimilarity(texts: string[]): number {
  if (texts.length < 2) return 0;
  let totalSimilarity = 0;
  let comparisons = 0;
  for (let i = 0; i < Math.min(texts.length, 20); i++) {
    for (let j = i + 1; j < Math.min(texts.length, 20); j++) {
      const sim = originalSimpleSimilarity(texts[i]!, texts[j]!);
      totalSimilarity += sim;
      comparisons++;
    }
  }
  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

function originalExtractSource(sourceHtml: string): string {
  const match = sourceHtml.match(/>([^<]+)</);
  return match ? match[1]! : 'unknown';
}

function originalTimeRegularity(
  hourDist: number[],
  stdDev: number,
  avgInterval: number
): number {
  const maxCount = Math.max(...hourDist);
  const variance = hourDist.reduce(
    (sum, count) => sum + Math.pow(count - maxCount / 24, 2),
    0
  );
  const evenness = 1 - Math.sqrt(variance) / (maxCount || 1);
  const intervalRegularity =
    avgInterval > 0 ? 1 - Math.min(stdDev / avgInterval, 1) : 0;
  return evenness * 0.4 + intervalRegularity * 0.6;
}

function originalContentMechanical(
  similarity: number,
  avgLength: number
): number {
  const similarityScore = similarity;
  const lengthVariance = avgLength < 50 || avgLength > 200 ? 0.3 : 0;
  return Math.min(similarityScore + lengthVariance, 1);
}

function originalAnalyzeTimeBehavior(posts: any[]) {
  const postTimes = posts.map((p) => new Date(p.created_at));
  const hourDistribution = new Array(24).fill(0);
  const intervals: number[] = [];
  postTimes.forEach((time) => {
    hourDistribution[time.getHours()]++;
  });
  for (let i = 1; i < postTimes.length; i++) {
    const interval =
      (postTimes[i - 1]!.getTime() - postTimes[i]!.getTime()) / 1000 / 60;
    intervals.push(interval);
  }
  const avgInterval =
    intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;
  const intervalStdDev = originalStdDev(intervals);
  const timeRegularityScore = originalTimeRegularity(
    hourDistribution,
    intervalStdDev,
    avgInterval
  );
  return {
    hourDistribution,
    mostActiveHours: hourDistribution
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((h) => h.hour),
    avgPostInterval: Math.round(avgInterval),
    intervalStdDev: Math.round(intervalStdDev),
    regularityScore: timeRegularityScore,
  };
}

function originalAnalyzeContentFeatures(posts: any[]) {
  const texts = posts.map((p) => p.text);
  const avgTextLength =
    texts.reduce((sum, t) => sum + t.length, 0) / texts.length;
  const textSimilarity = originalTextSimilarity(texts);
  const contentMechanicalScore = originalContentMechanical(
    textSimilarity,
    avgTextLength
  );
  return {
    avgTextLength: Math.round(avgTextLength),
    textSimilarity,
    mechanicalScore: contentMechanicalScore,
  };
}

function originalAnalyzeInteractionFeatures(posts: any[]) {
  const totalReposts = posts.reduce((sum, p) => sum + p.reposts_count, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.comments_count, 0);
  const totalLikes = posts.reduce((sum, p) => sum + p.attitudes_count, 0);
  return {
    avgReposts: Math.round(totalReposts / posts.length),
    avgComments: Math.round(totalComments / posts.length),
    avgLikes: Math.round(totalLikes / posts.length),
    totalInteractions: totalReposts + totalComments + totalLikes,
  };
}

function originalAnalyzeDeviceSources(posts: any[]) {
  const sourceCounts = new Map<string, number>();
  posts.forEach((p) => {
    const source = originalExtractSource(p.source);
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  });
  return Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, count]) => ({
      source,
      count,
      percentage: ((count / posts.length) * 100).toFixed(1),
    }));
}

function originalDetectSignals(posts: any[], nlpResults: any[]) {
  const abnormalSignals: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    value: any;
  }> = [];

  const postTimes = posts.map((p) => new Date(p.created_at));
  const hourDistribution = new Array(24).fill(0);
  postTimes.forEach((time) => {
    hourDistribution[time.getHours()]++;
  });
  const nightPosts = hourDistribution.slice(0, 6).reduce((a, b) => a + b, 0);
  const nightPostRatio = nightPosts / posts.length;
  if (nightPostRatio > 0.3) {
    abnormalSignals.push({
      type: 'night_activity',
      severity: 'medium',
      description: `凌晨(0-6点)活跃度异常：${(nightPostRatio * 100).toFixed(1)}% 的帖子发布于凌晨`,
      value: nightPostRatio,
    });
  }

  const intervals: number[] = [];
  for (let i = 1; i < postTimes.length; i++) {
    const interval =
      (postTimes[i - 1]!.getTime() - postTimes[i]!.getTime()) / 1000 / 60;
    intervals.push(interval);
  }
  const intervalStdDev = originalStdDev(intervals);
  const avgInterval =
    intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;
  if (intervalStdDev < avgInterval * 0.3 && intervals.length > 10) {
    abnormalSignals.push({
      type: 'regular_interval',
      severity: 'high',
      description: `发帖间隔高度规律（标准差 ${intervalStdDev.toFixed(1)}分钟，平均间隔 ${avgInterval.toFixed(1)}分钟），疑似定时任务`,
      value: { stdDev: intervalStdDev, avg: avgInterval },
    });
  }

  const recentHourPosts = posts.filter(
    (p) => new Date(p.created_at).getTime() > Date.now() - 60 * 60 * 1000
  ).length;
  if (recentHourPosts > 20) {
    abnormalSignals.push({
      type: 'burst_posting',
      severity: 'high',
      description: `1小时内发帖 ${recentHourPosts} 条，疑似爆发式刷屏`,
      value: recentHourPosts,
    });
  }

  const texts = posts.slice(0, 50).map((p) => p.text);
  const textSimilarity = originalTextSimilarity(texts);
  if (textSimilarity > 0.7) {
    abnormalSignals.push({
      type: 'high_similarity',
      severity: 'high',
      description: `文本相似度 ${(textSimilarity * 100).toFixed(1)}%，疑似复制粘贴或模板化`,
      value: textSimilarity,
    });
  }

  if (nlpResults.length > 10) {
    const sentiments = nlpResults.map((r) => r.sentiment.overall);
    const positiveCount = sentiments.filter((s) => s === 'positive').length;
    const negativeCount = sentiments.filter((s) => s === 'negative').length;
    const extremeRatio =
      Math.max(positiveCount, negativeCount) / sentiments.length;
    if (extremeRatio > 0.85) {
      abnormalSignals.push({
        type: 'extreme_sentiment',
        severity: 'medium',
        description: `情感极端化：${(extremeRatio * 100).toFixed(1)}% 的帖子为${positiveCount > negativeCount ? '正面' : '负面'}情感，缺乏中性表达`,
        value: {
          extremeRatio,
          dominant: positiveCount > negativeCount ? 'positive' : 'negative',
        },
      });
    }
  }

  const avgInteractions =
    posts.reduce(
      (sum, p) =>
        sum + p.reposts_count + p.comments_count + p.attitudes_count,
      0
    ) / posts.length;
  if (avgInteractions < 1 && posts.length > 20) {
    abnormalSignals.push({
      type: 'low_interaction',
      severity: 'low',
      description: `平均互动量极低（${avgInteractions.toFixed(2)}），疑似僵尸账号或被屏蔽`,
      value: avgInteractions,
    });
  }

  const sourceCounts = new Map<string, number>();
  posts.forEach((p) => {
    const source = originalExtractSource(p.source);
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  });
  const maxSourceCount = Math.max(...Array.from(sourceCounts.values()));
  const singleSourceRatio = maxSourceCount / posts.length;
  if (singleSourceRatio > 0.95 && posts.length > 50) {
    abnormalSignals.push({
      type: 'single_device',
      severity: 'low',
      description: `${(singleSourceRatio * 100).toFixed(1)}% 的帖子来自同一设备，缺乏设备多样性`,
      value: singleSourceRatio,
    });
  }

  return abnormalSignals;
}

// ---------------------------------------------------------------------------
// 测试数据
// ---------------------------------------------------------------------------

function makePost(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    created_at: '2026-08-01T12:00:00.000Z',
    text: '同一段完全一致的文本内容用于测试机械性相似度',
    reposts_count: 0,
    comments_count: 0,
    attitudes_count: 0,
    source: '<a>iPhone客户端</a>',
    ...overrides,
  };
}

const samplePosts = Array.from({ length: 60 }, (_, i) =>
  makePost({
    created_at: new Date(
      Date.UTC(2026, 7, 1, 12, 0) - i * 10 * 60 * 1000
    ).toISOString(),
  })
);

const variedPosts = [
  makePost({ created_at: '2026-08-01T10:00:00.000Z', text: '短文本', source: '<a>Android</a>', reposts_count: 5 }),
  makePost({ created_at: '2026-08-01T09:30:00.000Z', text: '中等长度文本内容，用于区分设备来源', source: '<a>iPhone客户端</a>', comments_count: 2 }),
  makePost({ created_at: '2026-08-01T09:00:00.000Z', text: '第三篇帖子，内容长度不同', source: '<a>Web</a>', attitudes_count: 8 }),
  makePost({ created_at: '2026-08-01T08:00:00.000Z', text: '第四篇帖子，长度也不一样', source: '<a>iPhone客户端</a>', reposts_count: 1 }),
];

describe('重构后的分析逻辑与原始实现一致', () => {
  it('calculateStdDev 与原始实现一致', () => {
    const samples = [
      [],
      [1],
      [1, 2, 3],
      [2, 4, 4, 4, 5, 5, 7, 9],
      [10, 10, 10],
      Array.from({ length: 100 }, (_, i) => i),
    ];
    for (const s of samples) {
      expect(calculateStdDev(s)).toBe(originalStdDev(s));
    }
  });

  it('calculateTextSimilarity 与原始实现一致', () => {
    const samples: string[][] = [
      [],
      ['a'],
      ['abc', 'abc'],
      ['abc', 'xyz'],
      ['同一段完全一致的文本内容', '同一段完全一致的文本内容'],
      Array.from({ length: 30 }, (_, i) => `文本内容${i % 3}`),
    ];
    for (const s of samples) {
      expect(calculateTextSimilarity(s)).toBe(originalTextSimilarity(s));
    }
  });

  it('extractSource 与原始实现一致', () => {
    const samples = [
      '<a href="http://weibo.com">iPhone客户端</a>',
      '<a>Android</a>',
      'no-html',
      '',
    ];
    for (const s of samples) {
      expect(extractSource(s)).toBe(originalExtractSource(s));
    }
  });

  it('calculateTimeRegularity 与原始实现一致', () => {
    const even = new Array(24).fill(10);
    const peaky = new Array(24).fill(0);
    peaky[0] = 240;
    const inputs: Array<[number[], number, number]> = [
      [even, 0, 60],
      [even, 30, 60],
      [peaky, 0, 60],
      [peaky, 5, 120],
      [new Array(24).fill(0), 0, 0],
    ];
    for (const [dist, stdDev, avg] of inputs) {
      expect(calculateTimeRegularity(dist, stdDev, avg)).toBe(
        originalTimeRegularity(dist, stdDev, avg)
      );
    }
  });

  it('calculateContentMechanical 与原始实现一致', () => {
    const samples: Array<[number, number]> = [
      [0, 0],
      [0.5, 100],
      [0.9, 30],
      [1, 500],
    ];
    for (const [sim, len] of samples) {
      expect(calculateContentMechanical(sim, len)).toBe(
        originalContentMechanical(sim, len)
      );
    }
  });

  it('analyzeTimeBehavior 与原始实现一致', () => {
    expect(analyzeTimeBehavior(samplePosts)).toEqual(
      originalAnalyzeTimeBehavior(samplePosts)
    );
    expect(analyzeTimeBehavior(variedPosts)).toEqual(
      originalAnalyzeTimeBehavior(variedPosts)
    );
  });

  it('analyzeContentFeatures 与原始实现一致', () => {
    expect(analyzeContentFeatures(samplePosts)).toEqual(
      originalAnalyzeContentFeatures(samplePosts)
    );
    expect(analyzeContentFeatures(variedPosts)).toEqual(
      originalAnalyzeContentFeatures(variedPosts)
    );
  });

  it('analyzeInteractionFeatures 与原始实现一致', () => {
    expect(analyzeInteractionFeatures(samplePosts)).toEqual(
      originalAnalyzeInteractionFeatures(samplePosts)
    );
    expect(analyzeInteractionFeatures(variedPosts)).toEqual(
      originalAnalyzeInteractionFeatures(variedPosts)
    );
  });

  it('analyzeDeviceSources 与原始实现一致', () => {
    expect(analyzeDeviceSources(samplePosts)).toEqual(
      originalAnalyzeDeviceSources(samplePosts)
    );
    expect(analyzeDeviceSources(variedPosts)).toEqual(
      originalAnalyzeDeviceSources(variedPosts)
    );
  });

  it('detectAbnormalSignals 与原始实现一致', () => {
    const nlpResults = Array.from({ length: 12 }, (_, i) => ({
      sentiment: { overall: i % 2 === 0 ? 'positive' : 'negative' },
    })) as any;
    expect(detectAbnormalSignals(samplePosts, nlpResults)).toEqual(
      originalDetectSignals(samplePosts, nlpResults)
    );
    expect(detectAbnormalSignals(variedPosts, [])).toEqual(
      originalDetectSignals(variedPosts, [])
    );
  });
});
