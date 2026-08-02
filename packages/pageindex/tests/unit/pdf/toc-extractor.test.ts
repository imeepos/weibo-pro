import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tocTransformer, tocIndexExtractor } from '../../../src/pdf/toc-extractor.js';
import { ChatGPT_API_with_finish_reason, } from '../../../src/utils/openai.js';
import { extractJson, getJsonContent } from '../../../src/utils/json.js';

// Mock OpenAI API
vi.mock('../../../src/utils/openai.js', () => ({
  ChatGPT_API_with_finish_reason: vi.fn(),
  ChatGPT_API: vi.fn(),
}));

// Mock JSON utils
vi.mock('../../../src/utils/json.js', () => ({
  extractJson: vi.fn(),
  getJsonContent: vi.fn(),
}));

describe('tocTransformer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该将目录文本转换为结构化JSON', async () => {
    const mockResponse = JSON.stringify({
      toc: [
        { title: 'Chapter 1', structure: '1', physical_index: 5 },
        { title: 'Chapter 2', structure: '2', physical_index: 10 },
      ]
    });

    vi.mocked(ChatGPT_API_with_finish_reason).mockResolvedValue([
      mockResponse,
      'finished'
    ]);
    vi.mocked(getJsonContent).mockReturnValue(mockResponse);
    vi.mocked(extractJson).mockReturnValue({
      toc: [
        { title: 'Chapter 1', structure: '1', physical_index: 5 },
        { title: 'Chapter 2', structure: '2', physical_index: 10 },
      ]
    });

    const tocContent = `
      Table of Contents

      Chapter 1 ............ 5
      Chapter 2 ............ 10
      Chapter 3 ............ 15
    `;

    const result = await tocTransformer(tocContent, 'gpt-4o');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('title');
    expect(result[0]).toHaveProperty('structure');
    expect(result[0]).toHaveProperty('physical_index');
  });

  it('应该处理续写机制 - 当输出被截断时继续生成', async () => {
    const firstResponse = JSON.stringify({
      toc: [
        { title: 'Chapter 1', structure: '1', physical_index: 5 }
      ]
    });

    const secondResponse = ', { "title": "Chapter 2", "structure": "2", "physical_index": 10 }]';

    vi.mocked(ChatGPT_API_with_finish_reason)
      .mockResolvedValueOnce([firstResponse, 'max_output_reached'])
      .mockResolvedValueOnce([secondResponse, 'finished']);

    vi.mocked(getJsonContent).mockReturnValue(firstResponse + secondResponse);
    vi.mocked(extractJson).mockReturnValue({
      toc: [
        { title: 'Chapter 1', structure: '1', physical_index: 5 },
        { title: 'Chapter 2', structure: '2', physical_index: 10 },
      ]
    });

    const tocContent = 'Chapter 1\nChapter 2';
    const result = await tocTransformer(tocContent, 'gpt-4o');

    expect(result).toHaveLength(2);
    expect(ChatGPT_API_with_finish_reason).toHaveBeenCalledTimes(2);
  });

  it('应该处理空内容', async () => {
    const result = await tocTransformer('', 'gpt-4o');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
    expect(ChatGPT_API_with_finish_reason).not.toHaveBeenCalled();
  });

  it('应该处理无页码的目录', async () => {
    const mockResponse = JSON.stringify({
      toc: [
        { title: 'Chapter 1', structure: '1' },
        { title: 'Chapter 2', structure: '2' },
        { title: 'Chapter 3', structure: '3' },
      ]
    });

    vi.mocked(ChatGPT_API_with_finish_reason).mockResolvedValue([
      mockResponse,
      'finished'
    ]);
    vi.mocked(getJsonContent).mockReturnValue(mockResponse);
    vi.mocked(extractJson).mockReturnValue({
      toc: [
        { title: 'Chapter 1', structure: '1' },
        { title: 'Chapter 2', structure: '2' },
        { title: 'Chapter 3', structure: '3' },
      ]
    });

    const tocContent = 'Chapter 1\nChapter 2\nChapter 3';
    const result = await tocTransformer(tocContent, 'gpt-4o');

    expect(result.length).toBe(3);
  });

  it('应该处理API错误并返回空数组', async () => {
    vi.mocked(ChatGPT_API_with_finish_reason).mockRejectedValue(
      new Error('API Error')
    );

    const tocContent = 'Chapter 1\nChapter 2';
    const result = await tocTransformer(tocContent, 'gpt-4o');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('应该处理JSON解析错误并返回空数组', async () => {
    const mockResponse = 'invalid json';

    vi.mocked(ChatGPT_API_with_finish_reason).mockResolvedValue([
      mockResponse,
      'finished'
    ]);
    vi.mocked(getJsonContent).mockReturnValue(mockResponse);
    vi.mocked(extractJson).mockReturnValue(null);

    const tocContent = 'Chapter 1';
    const result = await tocTransformer(tocContent, 'gpt-4o');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('应该限制续写尝试次数为最多5次', async () => {
    vi.mocked(ChatGPT_API_with_finish_reason).mockResolvedValue([
      'partial content',
      'max_output_reached'
    ]);

    const tocContent = 'Long content';
    const result = await tocTransformer(tocContent, 'gpt-4o');

    // 应该调用初始1次 + 续写5次
    expect(ChatGPT_API_with_finish_reason).toHaveBeenCalledTimes(6);
    expect(Array.isArray(result)).toBe(true);
  });

  it('应该为每个TOC项计算level', async () => {
    const mockResponse = JSON.stringify({
      toc: [
        { title: 'Chapter 1', structure: '1', physical_index: 5 },
        { title: 'Section 1.1', structure: '1.1', physical_index: 6 },
        { title: 'Subsection 1.1.1', structure: '1.1.1', physical_index: 7 },
      ]
    });

    vi.mocked(ChatGPT_API_with_finish_reason).mockResolvedValue([
      mockResponse,
      'finished'
    ]);
    vi.mocked(getJsonContent).mockReturnValue(mockResponse);
    vi.mocked(extractJson).mockReturnValue({
      toc: [
        { title: 'Chapter 1', structure: '1', physical_index: 5 },
        { title: 'Section 1.1', structure: '1.1', physical_index: 6 },
        { title: 'Subsection 1.1.1', structure: '1.1.1', physical_index: 7 },
      ]
    });

    const tocContent = 'Chapter 1\nSection 1.1\nSubsection 1.1.1';
    const result = await tocTransformer(tocContent, 'gpt-4o');

    expect(result[0].level).toBe(1);
    expect(result[1].level).toBe(2);
    expect(result[2].level).toBe(3);
  });
});

describe('tocIndexExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该提取目录中的页码信息', async () => {
    const mockResponse = JSON.stringify({
      toc: [
        { title: 'Chapter 1', structure: '1', physical_index: 5 }
      ]
    });

    vi.mocked(ChatGPT_API_with_finish_reason).mockResolvedValue([
      mockResponse,
      'finished'
    ]);
    vi.mocked(getJsonContent).mockReturnValue(mockResponse);
    vi.mocked(extractJson).mockReturnValue({
      toc: [
        { title: 'Chapter 1', structure: '1', physical_index: 5 }
      ]
    });

    const tocContent = 'Chapter 1 ............ 5';
    const tocIndexGiven = 'Page numbers present';

    const result = await tocIndexExtractor(tocContent, tocIndexGiven, 'gpt-4o');

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('physical_index');
    }
  });

  it('应该调用tocTransformer函数', async () => {
    const mockResponse = JSON.stringify({
      toc: [
        { title: 'Chapter 1', structure: '1', physical_index: 5 }
      ]
    });

    vi.mocked(ChatGPT_API_with_finish_reason).mockResolvedValue([
      mockResponse,
      'finished'
    ]);
    vi.mocked(getJsonContent).mockReturnValue(mockResponse);
    vi.mocked(extractJson).mockReturnValue({
      toc: [
        { title: 'Chapter 1', structure: '1', physical_index: 5 }
      ]
    });

    const tocContent = 'Chapter 1';
    const tocIndexGiven = 'yes';
    const model = 'gpt-4o';

    await tocIndexExtractor(tocContent, tocIndexGiven, model);

    expect(ChatGPT_API_with_finish_reason).toHaveBeenCalled();
  });
});
