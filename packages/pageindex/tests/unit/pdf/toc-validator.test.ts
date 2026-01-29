/**
 * TOC验证器单元测试
 *
 * 测试TOC目录验证和修正功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyToc, fixIncorrectToc } from '../../../src/pdf/toc-validator.js';
import type { TOCItem } from '../../../src/types/result.types.new.js';
import type { PageToken } from '../../../src/types/result.types.js';

// Mock ChatGPT_API_async
vi.mock('../../../src/utils/openai.js', () => ({
  ChatGPT_API_async: vi.fn(),
}));

import { ChatGPT_API_async } from '../../../src/utils/openai.js';

describe('verifyToc', () => {
  const mockModel = 'gpt-4o';
  let mockPageList: PageToken[];

  beforeEach(() => {
    // 重置mock
    vi.mocked(ChatGPT_API_async).mockReset();

    // 准备测试数据
    mockPageList = [
      { text: 'Page 1 content', tokenCount: 100 },
      { text: 'Page 2 content', tokenCount: 150 },
      { text: 'Page 3 content', tokenCount: 200 },
    ];
  });

  it('空TOC应返回100%准确率', async () => {
    const tocStructure: TOCItem[] = [];

    const accuracy = await verifyToc(tocStructure, mockPageList, mockModel);

    expect(accuracy).toBe(100);
    expect(ChatGPT_API_async).not.toHaveBeenCalled();
  });

  it('所有项正确应返回100', async () => {
    const tocStructure: TOCItem[] = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 },
      { title: 'Chapter 2', structure: '2', physical_index: 2, list_index: 1 },
    ];

    // Mock所有验证都返回yes
    vi.mocked(ChatGPT_API_async).mockResolvedValue('yes');

    const accuracy = await verifyToc(tocStructure, mockPageList, mockModel);

    expect(accuracy).toBe(100);
    expect(ChatGPT_API_async).toHaveBeenCalledTimes(2);
  });

  it('部分错误应返回正确比例', async () => {
    const tocStructure: TOCItem[] = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 },
      { title: 'Chapter 2', structure: '2', physical_index: 2, list_index: 1 },
      { title: 'Chapter 3', structure: '3', physical_index: 3, list_index: 2 },
      { title: 'Chapter 4', structure: '4', physical_index: 4, list_index: 3 },
    ];

    // Mock: 第1、3个正确，第2、4个错误
    vi.mocked(ChatGPT_API_async)
      .mockResolvedValueOnce('yes')
      .mockResolvedValueOnce('no')
      .mockResolvedValueOnce('yes')
      .mockResolvedValueOnce('no');

    const accuracy = await verifyToc(tocStructure, mockPageList, mockModel);

    expect(accuracy).toBe(50); // 4个中2个正确
  });

  it('并发验证所有目录项', async () => {
    const tocStructure: TOCItem[] = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 },
      { title: 'Chapter 2', structure: '2', physical_index: 2, list_index: 1 },
      { title: 'Chapter 3', structure: '3', physical_index: 3, list_index: 2 },
    ];

    vi.mocked(ChatGPT_API_async).mockResolvedValue('yes');

    const startTime = Date.now();
    await verifyToc(tocStructure, mockPageList, mockModel);
    const endTime = Date.now();

    // 验证被调用了3次
    expect(ChatGPT_API_async).toHaveBeenCalledTimes(3);

    // 如果是串行执行，假设每个调用至少需要1ms
    // 并发执行应该更快（这里只是示意，实际测试中可能需要更精确的计时）
    const calls = vi.mocked(ChatGPT_API_async).mock.calls;
    expect(calls.length).toBe(3);
  });

  it('无physical_index的项应跳过', async () => {
    const tocStructure: TOCItem[] = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 },
      { title: 'Chapter 2', structure: '2', list_index: 1 }, // 无physical_index
      { title: 'Chapter 3', structure: '3', physical_index: 3, list_index: 2 },
    ];

    vi.mocked(ChatGPT_API_async).mockResolvedValue('yes');

    const accuracy = await verifyToc(tocStructure, mockPageList, mockModel);

    // 只有2个有physical_index的项被验证
    expect(ChatGPT_API_async).toHaveBeenCalledTimes(2);

    // 准确率基于2个可验证的项，都是正确的
    expect(accuracy).toBe(100);
  });

  it('所有项都错误应返回0', async () => {
    const tocStructure: TOCItem[] = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 },
      { title: 'Chapter 2', structure: '2', physical_index: 2, list_index: 1 },
    ];

    vi.mocked(ChatGPT_API_async).mockResolvedValue('no');

    const accuracy = await verifyToc(tocStructure, mockPageList, mockModel);

    expect(accuracy).toBe(0);
  });
});

describe('fixIncorrectToc', () => {
  const mockModel = 'gpt-4o';
  let mockPageList: PageToken[];

  beforeEach(() => {
    vi.mocked(ChatGPT_API_async).mockReset();

    mockPageList = [
      { text: 'Page 1 content', tokenCount: 100 },
      { text: 'Page 2 content', tokenCount: 150 },
      { text: 'Page 3 content', tokenCount: 200 },
    ];
  });

  it('空TOC应返回空数组', async () => {
    const tocStructure: TOCItem[] = [];

    const result = await fixIncorrectToc(tocStructure, mockPageList, mockModel);

    expect(result).toEqual([]);
    expect(ChatGPT_API_async).not.toHaveBeenCalled();
  });

  it('正确的TOC应保持不变并设置appear_start=yes', async () => {
    const tocStructure: TOCItem[] = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 },
      { title: 'Chapter 2', structure: '2', physical_index: 2, list_index: 1 },
    ];

    vi.mocked(ChatGPT_API_async).mockResolvedValue('yes');

    const result = await fixIncorrectToc(tocStructure, mockPageList, mockModel);

    expect(result).toHaveLength(2);
    expect(result[0].appear_start).toBe('yes');
    expect(result[1].appear_start).toBe('yes');
    expect(result[0].physical_index).toBe(1);
    expect(result[1].physical_index).toBe(2);
  });

  it('错误的TOC应标记appear_start', async () => {
    const tocStructure: TOCItem[] = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 }, // 在范围内但标题不匹配
      { title: 'Chapter 2', structure: '2', physical_index: 2, list_index: 1 },
    ];

    // 第一个页码1在范围内,但标题不匹配,标记为no;第二个正确标记为yes
    vi.mocked(ChatGPT_API_async)
      .mockResolvedValueOnce('no')  // 第1页没有Chapter 1标题
      .mockResolvedValueOnce('yes'); // 第2页有Chapter 2标题

    const result = await fixIncorrectToc(tocStructure, mockPageList, mockModel);

    expect(result).toHaveLength(2);
    expect(result[0].physical_index).toBe(1); // 页码保持不变
    expect(result[0].appear_start).toBe('no'); // 但标记为错误
    expect(result[1].appear_start).toBe('yes');
  });

  it('无physical_index的项应保持不变', async () => {
    const tocStructure: TOCItem[] = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 },
      { title: 'Chapter 2', structure: '2', list_index: 1 }, // 无physical_index
      { title: 'Chapter 3', structure: '3', physical_index: 3, list_index: 2 },
    ];

    vi.mocked(ChatGPT_API_async).mockResolvedValue('yes');

    const result = await fixIncorrectToc(tocStructure, mockPageList, mockModel);

    expect(result).toHaveLength(3);
    expect(result[0].appear_start).toBe('yes');
    expect(result[1]).not.toHaveProperty('appear_start'); // 无physical_index，无appear_start
    expect(result[2].appear_start).toBe('yes');
  });

  it('并发修正多个错误项', async () => {
    const tocStructure: TOCItem[] = [
      { title: 'Chapter 1', structure: '1', physical_index: 999, list_index: 0 },
      { title: 'Chapter 2', structure: '2', physical_index: 888, list_index: 1 },
      { title: 'Chapter 3', structure: '3', physical_index: 3, list_index: 2 },
    ];

    vi.mocked(ChatGPT_API_async).mockResolvedValue('yes');

    const result = await fixIncorrectToc(tocStructure, mockPageList, mockModel);

    expect(result).toHaveLength(3);
    expect(ChatGPT_API_async).toHaveBeenCalled();
  });

  it('应保留原始TOC的其他字段', async () => {
    const tocStructure: TOCItem[] = [
      {
        title: 'Chapter 1',
        structure: '1.1',
        physical_index: 1,
        list_index: 0,
        page: 5, // 额外字段
      },
    ];

    vi.mocked(ChatGPT_API_async).mockResolvedValue('yes');

    const result = await fixIncorrectToc(tocStructure, mockPageList, mockModel);

    expect(result[0].structure).toBe('1.1');
    expect(result[0].page).toBe(5);
    expect(result[0].appear_start).toBe('yes');
  });
});
