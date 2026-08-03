import { describe, it, expect, vi } from 'vitest';

// NLPAnalyzer is only used as a constructor token/type in OpinionAgent — mock it
// so the real @sker/nlp module (which talks to an LLM) is never loaded.
vi.mock('@sker/nlp', () => ({
  NLPAnalyzer: class {},
}));

import { OpinionAgent } from '../OpinionAgent';
import type { OpinionTask } from '../types';

interface SentimentShape {
  overall: string;
  positive_prob: number;
  negative_prob: number;
  neutral_prob: number;
}

interface AnalysisShape {
  sentiment: SentimentShape;
  keywords: Array<{ keyword: string; weight: number }>;
}

function makeAnalysis(overrides: Partial<AnalysisShape> = {}): AnalysisShape {
  return {
    sentiment: {
      overall: 'neutral',
      positive_prob: 0.5,
      negative_prob: 0.2,
      neutral_prob: 0.3,
    },
    keywords: [],
    ...overrides,
  };
}

function makeTask(overrides: Partial<OpinionTask> = {}): OpinionTask {
  return {
    id: 'op-1',
    context: {
      postId: 'p1',
      content: '一段微博文本',
      comments: [],
      subComments: [],
      reposts: [],
    },
    history: [],
    ...overrides,
  };
}

describe('OpinionAgent', () => {
  it('analyze() returns a complete report structure', async () => {
    const nlp = { analyze: vi.fn().mockResolvedValue(makeAnalysis()) };
    const agent = new OpinionAgent(nlp as any);

    const report = await agent.analyze(makeTask());

    expect(nlp.analyze).toHaveBeenCalledTimes(1);
    expect(nlp.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ postId: 'p1' })
    );

    expect(report.taskId).toBe('op-1');
    expect(report.analysis).toEqual(makeAnalysis());
    expect(report.trend).toEqual({ direction: 'stable', magnitude: 0 });
    expect(report.risk).toEqual(
      expect.objectContaining({ level: 'low', score: 0 })
    );
    expect(report.risk.reasons).toEqual([]);
    expect(typeof report.timestamp).toBe('number');
  });

  it('returns stable trend when history is too short', async () => {
    const nlp = {
      analyze: vi.fn().mockResolvedValue(
        makeAnalysis({
          sentiment: {
            overall: 'positive',
            positive_prob: 0.9,
            negative_prob: 0.05,
            neutral_prob: 0.05,
          },
        })
      ),
    };
    const agent = new OpinionAgent(nlp as any);

    const report = await agent.analyze(
      makeTask({
        history: [
          { sentiment: { positive_prob: 0.2 }, timestamp: 1 },
          { sentiment: { positive_prob: 0.8 }, timestamp: 2 },
        ],
      })
    );

    // history.length === 2 is not < 2, so trend is computed from last 5
    expect(report.trend.direction).toBe('rising');
    expect(report.trend.magnitude).toBeCloseTo(0.9 - 0.5, 5);
  });

  it('detects a rising sentiment trend from history', async () => {
    const nlp = {
      analyze: vi.fn().mockResolvedValue(
        makeAnalysis({
          sentiment: {
            overall: 'positive',
            positive_prob: 0.9,
            negative_prob: 0.05,
            neutral_prob: 0.05,
          },
        })
      ),
    };
    const agent = new OpinionAgent(nlp as any);

    const report = await agent.analyze(
      makeTask({
        history: [
          { sentiment: { positive_prob: 0.3 }, timestamp: 1 },
          { sentiment: { positive_prob: 0.4 }, timestamp: 2 },
          { sentiment: { positive_prob: 0.5 }, timestamp: 3 },
        ],
      })
    );

    expect(report.trend.direction).toBe('rising');
    expect(report.trend.magnitude).toBeCloseTo(0.5, 5);
  });

  it('scores risk high for negative sentiment + falling trend + sensitive keywords', async () => {
    const nlp = {
      analyze: vi.fn().mockResolvedValue(
        makeAnalysis({
          sentiment: {
            overall: 'negative',
            positive_prob: 0.1,
            negative_prob: 0.85,
            neutral_prob: 0.05,
          },
          keywords: [{ keyword: '诈骗', weight: 0.9 }],
        })
      ),
    };
    const agent = new OpinionAgent(nlp as any);

    const report = await agent.analyze(
      makeTask({
        history: [
          { sentiment: { positive_prob: 0.8 }, timestamp: 1 },
          { sentiment: { positive_prob: 0.7 }, timestamp: 2 },
          { sentiment: { positive_prob: 0.6 }, timestamp: 3 },
        ],
      })
    );

    // -40 负面情绪占比高, -30 情感下滑, -30 敏感关键词 => 100 => high
    expect(report.risk.score).toBe(100);
    expect(report.risk.level).toBe('high');
    expect(report.risk.reasons.length).toBeGreaterThanOrEqual(3);
    expect(report.risk.reasons.join('')).toContain('负面情绪占比高');
    expect(report.risk.reasons.join('')).toContain('敏感关键词');
  });

  it('scores risk medium for borderline signals', async () => {
    const nlp = {
      analyze: vi.fn().mockResolvedValue(
        makeAnalysis({
          sentiment: {
            overall: 'negative',
            positive_prob: 0.3,
            negative_prob: 0.7,
            neutral_prob: 0.0,
          },
          keywords: [{ keyword: '欺诈', weight: 0.8 }],
        })
      ),
    };
    const agent = new OpinionAgent(nlp as any);

    const report = await agent.analyze(
      makeTask({
        history: [
          { sentiment: { positive_prob: 0.3 }, timestamp: 1 },
          { sentiment: { positive_prob: 0.3 }, timestamp: 2 },
        ],
      })
    );

    // -40 负面情绪占比高 + 30 敏感关键词(欺诈) = 70 => medium (score > 40
    // but not > 70), and trend is stable so no extra falling bonus.
    expect(report.risk.score).toBe(70);
    expect(report.risk.level).toBe('medium');
  });

  it('propagates errors from the underlying NLPAnalyzer', async () => {
    const nlp = {
      analyze: vi.fn().mockRejectedValue(new Error('NLP 服务不可用')),
    };
    const agent = new OpinionAgent(nlp as any);

    await expect(agent.analyze(makeTask())).rejects.toThrow('NLP 服务不可用');
  });

  it('calculateTrend only considers the last 5 history entries', () => {
    const nlp = { analyze: vi.fn() };
    // Access the private method through the instance for direct unit coverage.
    const agent = new OpinionAgent(nlp as any) as unknown as {
      calculateTrend: (history: any[], current: any) => {
        direction: string;
        magnitude: number;
      };
    };

    const history = [
      { sentiment: { positive_prob: 0.9 } },
      { sentiment: { positive_prob: 0.9 } },
      { sentiment: { positive_prob: 0.9 } },
      { sentiment: { positive_prob: 0.9 } },
      { sentiment: { positive_prob: 0.9 } },
      { sentiment: { positive_prob: 0.2 } },
      { sentiment: { positive_prob: 0.2 } },
    ];

    const trend = agent.calculateTrend(history, { positive_prob: 0.2 });
    // last 5 = [0.9, 0.9, 0.9, 0.2, 0.2] -> avg 0.62 -> diff -0.42 -> falling
    expect(trend.direction).toBe('falling');
    expect(trend.magnitude).toBeCloseTo(0.42, 5);
  });
});
