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
import {
  originalStdDev,
  originalTextSimilarity,
  originalExtractSource,
  originalTimeRegularity,
  originalContentMechanical,
  originalAnalyzeTimeBehavior,
  originalAnalyzeContentFeatures,
  originalAnalyzeInteractionFeatures,
  originalAnalyzeDeviceSources,
  originalDetectSignals,
  samplePosts,
  variedPosts,
} from './user-profile.analysis.fixtures';

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
