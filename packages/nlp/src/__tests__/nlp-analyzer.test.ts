import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NLPAnalyzer } from '../NLPAnalyzer';
import type { CompleteAnalysisResult, PostContext } from '../types';

const { mockUseOpenAi, mockCreate } = vi.hoisted(() => ({
  mockUseOpenAi: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock('../openai', () => ({
  useOpenAi: mockUseOpenAi,
  getOpenAiConfig: vi.fn(),
  OpenAI: vi.fn(),
}));

const baseContext: PostContext = {
  postId: 'post-1',
  content: '今天天气真好，适合出门散步。',
  comments: ['评论一：确实不错', '评论二：我也觉得'],
  subComments: ['子评论一：楼上说得对'],
  reposts: ['转发一：围观'],
};

const validContent = JSON.stringify({
  sentiment: {
    overall: 'positive',
    confidence: 0.95,
    positive_prob: 0.75,
    negative_prob: 0.1,
    neutral_prob: 0.15,
  },
  keywords: [
    { keyword: '天气', weight: 0.95, sentiment: 'positive', pos: 'noun', count: 8 },
    { keyword: '散步', weight: 0.8, sentiment: 'neutral', pos: 'verb', count: 5 },
  ],
});

const expectedResult: CompleteAnalysisResult = JSON.parse(validContent);

const successResponse = {
  choices: [{ message: { content: validContent } }],
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  mockUseOpenAi.mockResolvedValue({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('NLPAnalyzer.analyze', () => {
  it('分析成功：返回解析后的 CompleteAnalysisResult', async () => {
    const analyzer = new NLPAnalyzer();
    mockCreate.mockResolvedValue(successResponse);

    const result = await analyzer.analyze(baseContext);

    expect(result).toEqual(expectedResult);
    expect(result.sentiment.overall).toBe('positive');
    expect(result.keywords).toHaveLength(2);
    expect(result.keywords[0]?.keyword).toBe('天气');
  });

  it('以正确 model / messages / temperature 调用 create', async () => {
    const analyzer = new NLPAnalyzer();
    mockCreate.mockResolvedValue(successResponse);

    await analyzer.analyze(baseContext);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const [callArg] = mockCreate.mock.calls[0] ?? [];
    expect(callArg.model).toBe('deepseek-ai/DeepSeek-V3.2');
    expect(callArg.temperature).toBe(0.2);
    expect(callArg.messages).toHaveLength(1);
    expect(callArg.messages[0].role).toBe('user');

    const prompt: string = callArg.messages[0].content;
    // 帖子内容
    expect(prompt).toContain('【帖子内容】');
    expect(prompt).toContain(baseContext.content);
    // 评论
    expect(prompt).toContain('【评论】');
    expect(prompt).toContain('评论一：确实不错');
    expect(prompt).toContain('评论二：我也觉得');
    // 子评论
    expect(prompt).toContain('【子评论】');
    expect(prompt).toContain('子评论一：楼上说得对');
    // 转发
    expect(prompt).toContain('【转发】');
    expect(prompt).toContain('转发一：围观');
  });

  it('解析结果符合 CompleteAnalysisResult 结构', async () => {
    const analyzer = new NLPAnalyzer();
    mockCreate.mockResolvedValue(successResponse);

    const result = await analyzer.analyze(baseContext);

    expect(['positive', 'negative', 'neutral']).toContain(
      result.sentiment.overall,
    );
    expect(typeof result.sentiment.confidence).toBe('number');
    expect(result.sentiment.positive_prob).toBeGreaterThan(0);
    expect(result.sentiment.negative_prob).toBeGreaterThanOrEqual(0);
    expect(result.sentiment.neutral_prob).toBeGreaterThanOrEqual(0);
    expect(
      result.sentiment.positive_prob +
        result.sentiment.negative_prob +
        result.sentiment.neutral_prob,
    ).toBeCloseTo(1, 5);

    for (const keyword of result.keywords) {
      expect(typeof keyword.keyword).toBe('string');
      expect(typeof keyword.weight).toBe('number');
      expect(['positive', 'negative', 'neutral']).toContain(keyword.sentiment);
      expect(typeof keyword.pos).toBe('string');
      expect(typeof keyword.count).toBe('number');
    }
  });

  it('LLM 返回空 content 时抛出「NLP 分析失败: LLM 未返回有效内容」', async () => {
    const analyzer = new NLPAnalyzer();
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '' } }] });

    await expect(analyzer.analyze(baseContext)).rejects.toThrow(
      'NLP 分析失败: LLM 未返回有效内容',
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('不可重试错误（400）立即抛出 NLP 分析失败，不重试', async () => {
    const analyzer = new NLPAnalyzer();
    mockCreate.mockRejectedValue(new Error('400 Bad Request'));

    await expect(analyzer.analyze(baseContext)).rejects.toThrow(
      'NLP 分析失败: 400 Bad Request',
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('可重试错误按指数退避（5s、10s）重试直到成功', async () => {
    vi.useFakeTimers();
    const analyzer = new NLPAnalyzer();
    mockCreate
      .mockRejectedValueOnce(new Error('429 rate limit'))
      .mockRejectedValueOnce(new Error('429 rate limit'))
      .mockResolvedValueOnce(successResponse);

    const promise = analyzer.analyze(baseContext);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(10000);
    const result = await promise;

    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(result).toEqual(expectedResult);
  });

  it('连续可重试错误超过 MAX_RETRIES 抛出「NLP 分析失败: 达到最大重试次数」', async () => {
    vi.useFakeTimers();
    const analyzer = new NLPAnalyzer();
    mockCreate.mockRejectedValue(new Error('ECONNREFUSED'));

    const promise = analyzer.analyze(baseContext);
    // 先挂上 rejection handler，避免推进假定时器时出现未处理的 rejection
    const assertion = expect(promise).rejects.toThrow(
      'NLP 分析失败: 达到最大重试次数',
    );
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(10000);
    await assertion;
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});
