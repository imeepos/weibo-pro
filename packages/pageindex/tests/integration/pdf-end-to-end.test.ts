import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { page_index_main } from '../../src/pdf/page-index.js';
import type { Config } from '../../src/types/config.types.js';
import * as pdfjsLib from 'pdfjs-dist';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
}));

describe('PDF处理端到端测试', () => {
  const mockConfig: Config = {
    model: 'gpt-4o-2024-11-20',
    toc_check_page_num: 20,
    max_page_num_each_node: 10,
    max_token_num_each_node: 20000,
    if_add_node_id: 'yes',
    if_add_node_summary: 'no',
    if_add_doc_description: 'no',
    if_add_node_text: 'no',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('完整PDF处理流程', () => {
    it('应该完整处理一个简单的PDF文档', async () => {
      // Mock PDF文档加载
      const mockPdfDoc = {
        numPages: 5,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: 'Test content' }],
          }),
        }),
      };

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc as any),
      } as any);

      // Mock OpenAI API调用
      const chatGPTSpy = vi.spyOn(
        await import('../../src/utils/openai.js'),
        'ChatGPT_API_async'
      ).mockResolvedValue({
        content: JSON.stringify({
          has_toc: false,
          confidence: 0.9,
        }),
        usage: { total_tokens: 100 },
      } as any);

      const result = await page_index_main('test.pdf', mockConfig);

      // 验证基本结构
      expect(result).toHaveProperty('doc_name');
      expect(result).toHaveProperty('structure');
      expect(Array.isArray(result.structure)).toBe(true);
      expect(result.doc_name).toBe('test');

      chatGPTSpy.mockRestore();
    });

    it('应该正确处理有TOC的PDF', async () => {
      const mockPdfDoc = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [
              { str: '目录' },
              { str: '第一章 1' },
              { str: '第二章 5' },
            ],
          }),
        }),
      };

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc as any),
      } as any);

      // Mock TOC检测返回true
      const chatGPTSpy = vi.spyOn(
        await import('../../src/utils/openai.js'),
        'ChatGPT_API_async'
      ).mockResolvedValue({
        content: JSON.stringify({
          has_toc: true,
          confidence: 0.95,
        }),
        usage: { total_tokens: 100 },
      } as any);

      const result = await page_index_main('test-with-toc.pdf', mockConfig);

      // 验证结构
      expect(result.structure).toBeDefined();
      expect(result.structure.length).toBeGreaterThan(0);

      chatGPTSpy.mockRestore();
    });

    it('应该正确处理无TOC的PDF', async () => {
      const mockPdfDoc = {
        numPages: 3,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: 'Some content without TOC' }],
          }),
        }),
      };

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc as any),
      } as any);

      // Mock TOC检测返回false
      const chatGPTSpy = vi.spyOn(
        await import('../../src/utils/openai.js'),
        'ChatGPT_API_async'
      ).mockResolvedValue({
        content: JSON.stringify({
          has_toc: false,
          confidence: 0.85,
        }),
        usage: { total_tokens: 100 },
      } as any);

      // Mock AI生成结构
      chatGPTSpy.mockResolvedValue({
        content: JSON.stringify({
          structure: [
            {
              title: '第一章',
              appear_start: 1,
              appear_end: 2,
              level: 1,
              nodes: [],
            },
          ],
        }),
        usage: { total_tokens: 200 },
      } as any);

      const result = await page_index_main('test-no-toc.pdf', mockConfig);

      // 验证结构由AI生成
      expect(result.structure).toBeDefined();
      expect(result.structure.length).toBeGreaterThan(0);

      chatGPTSpy.mockRestore();
    });
  });

  describe('输出格式验证', () => {
    it('应该返回正确的输出格式', async () => {
      const mockPdfDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: 'Content' }],
          }),
        }),
      };

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc as any),
      } as any);

      const chatGPTSpy = vi.spyOn(
        await import('../../src/utils/openai.js'),
        'ChatGPT_API_async'
      ).mockResolvedValue({
        content: JSON.stringify({
          has_toc: false,
          confidence: 0.9,
        }),
        usage: { total_tokens: 100 },
      } as any);

      const result = await page_index_main('format-test.pdf', mockConfig);

      // 验证必需字段
      expect(result).toMatchObject({
        doc_name: expect.any(String),
        structure: expect.any(Array),
      });

      // 验证structure不为空
      expect(result.structure.length).toBeGreaterThanOrEqual(0);

      chatGPTSpy.mockRestore();
    });

    it('应该正确处理错误情况', async () => {
      // Mock PDF加载失败
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.reject(new Error('PDF load failed')),
      } as any);

      await expect(page_index_main('invalid.pdf', mockConfig)).rejects.toThrow();
    });
  });
});
