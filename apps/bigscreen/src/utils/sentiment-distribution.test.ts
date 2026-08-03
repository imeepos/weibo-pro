import { describe, it, expect } from 'vitest';
import { toSentimentDistribution } from './index';

describe('toSentimentDistribution', () => {
  it('positive → 正类为 1', () => {
    expect(toSentimentDistribution('positive')).toEqual({
      positive: 1,
      negative: 0,
      neutral: 0,
    });
  });

  it('negative → 负类为 1', () => {
    expect(toSentimentDistribution('negative')).toEqual({
      positive: 0,
      negative: 1,
      neutral: 0,
    });
  });

  it('neutral → 中性类为 1', () => {
    expect(toSentimentDistribution('neutral')).toEqual({
      positive: 0,
      negative: 0,
      neutral: 1,
    });
  });

  it('undefined（缺省）按中性处理', () => {
    expect(toSentimentDistribution(undefined)).toEqual({
      positive: 0,
      negative: 0,
      neutral: 1,
    });
  });
});
