import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tocDetectorSinglePage, findTocPages } from '../../../src/pdf/toc-detector.js';
import type { PageToken } from '../../../src/types/result.types.js';

// Mock ChatGPT_API
vi.mock('../../../src/utils/openai.js', () => ({
  ChatGPT_API: vi.fn(),
}));

describe('toc-detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tocDetectorSinglePage', () => {
    it('应该返回"yes"当页面包含目录时', async () => {
      // Arrange
      const { ChatGPT_API } = await import('../../../src/utils/openai.js');
      vi.mocked(ChatGPT_API).mockResolvedValue('yes');

      const tocPageContent = 'Table of Contents\nChapter 1 ............ 1\nChapter 2 ............ 5';

      // Act
      const result = await tocDetectorSinglePage(tocPageContent, 'gpt-4o');

      // Assert
      expect(result).toBe('yes');
      expect(ChatGPT_API).toHaveBeenCalledTimes(1);
    });

    it('应该返回"no"当页面不包含目录时', async () => {
      // Arrange
      const { ChatGPT_API } = await import('../../../src/utils/openai.js');
      vi.mocked(ChatGPT_API).mockResolvedValue('no');

      const normalPageContent = 'This is a normal page with regular content.';

      // Act
      const result = await tocDetectorSinglePage(normalPageContent, 'gpt-4o');

      // Assert
      expect(result).toBe('no');
    });

    it('应该处理包含"Contents"关键字的页面', async () => {
      // Arrange
      const { ChatGPT_API } = await import('../../../src/utils/openai.js');
      vi.mocked(ChatGPT_API).mockResolvedValue('yes');

      const tocPageContent = 'Contents\n1. Introduction ............ 1\n2. Methods ............ 10';

      // Act
      const result = await tocDetectorSinglePage(tocPageContent, 'gpt-4o');

      // Assert
      expect(result).toBe('yes');
    });

    it('应该处理空页面内容', async () => {
      // Arrange
      const { ChatGPT_API } = await import('../../../src/utils/openai.js');
      vi.mocked(ChatGPT_API).mockResolvedValue('no');

      const emptyContent = '';

      // Act
      const result = await tocDetectorSinglePage(emptyContent, 'gpt-4o');

      // Assert
      expect(result).toBe('no');
    });

    it('应该处理API返回的格式化答案', async () => {
      // Arrange
      const { ChatGPT_API } = await import('../../../src/utils/openai.js');
      vi.mocked(ChatGPT_API).mockResolvedValue('Answer: yes');

      const tocPageContent = 'TABLE OF CONTENTS\nChapter 1\nChapter 2';

      // Act
      const result = await tocDetectorSinglePage(tocPageContent, 'gpt-4o');

      // Assert
      expect(result).toBe('yes');
    });
  });

  describe('findTocPages', () => {
    it('应该找到连续的目录页', async () => {
      // Arrange
      const { ChatGPT_API } = await import('../../../src/utils/openai.js');
      vi.mocked(ChatGPT_API)
        .mockResolvedValueOnce('yes')  // Page 1
        .mockResolvedValueOnce('yes')  // Page 2
        .mockResolvedValueOnce('no');  // Page 3

      const pageList: PageToken[] = [
        { text: 'Table of Contents', tokenCount: 50 },
        { text: 'Chapter 1 ............ 1', tokenCount: 50 },
        { text: 'Normal content starts here', tokenCount: 100 },
      ];

      // Act
      const result = await findTocPages(pageList, 10, 'gpt-4o');

      // Assert
      expect(result).toEqual([1, 2]);
      expect(ChatGPT_API).toHaveBeenCalledTimes(3);
    });

    it('应该在连续3页非TOC后停止检测', async () => {
      // Arrange
      const { ChatGPT_API } = await import('../../../src/utils/openai.js');
      vi.mocked(ChatGPT_API)
        .mockResolvedValueOnce('yes')  // Page 1 - TOC
        .mockResolvedValueOnce('no')   // Page 2 - non-TOC
        .mockResolvedValueOnce('no')   // Page 3 - non-TOC
        .mockResolvedValueOnce('no');  // Page 4 - non-TOC (should stop)

      const pageList: PageToken[] = [
        { text: 'Table of Contents', tokenCount: 50 },
        { text: 'Normal content', tokenCount: 100 },
        { text: 'More content', tokenCount: 100 },
        { text: 'Even more content', tokenCount: 100 },
        { text: 'Should not check this page', tokenCount: 100 },
      ];

      // Act
      const result = await findTocPages(pageList, 10, 'gpt-4o');

      // Assert
      expect(result).toEqual([1]);
      // Should stop after 3 consecutive non-TOC pages
      expect(ChatGPT_API).toHaveBeenCalledTimes(4);
    });

    it('应该处理没有目录的情况', async () => {
      // Arrange
      const { ChatGPT_API } = await import('../../../src/utils/openai.js');
      vi.mocked(ChatGPT_API)
        .mockResolvedValueOnce('no')
        .mockResolvedValueOnce('no')
        .mockResolvedValueOnce('no');

      const pageList: PageToken[] = [
        { text: 'Page 1 content', tokenCount: 100 },
        { text: 'Page 2 content', tokenCount: 100 },
        { text: 'Page 3 content', tokenCount: 100 },
      ];

      // Act
      const result = await findTocPages(pageList, 10, 'gpt-4o');

      // Assert
      expect(result).toEqual([]);
    });

    it('应该检测到非连续的目录页', async () => {
      // Arrange
      const { ChatGPT_API } = await import('../../../src/utils/openai.js');
      vi.mocked(ChatGPT_API)
        .mockResolvedValueOnce('yes')  // Page 1
        .mockResolvedValueOnce('no')   // Page 2
        .mockResolvedValueOnce('yes')  // Page 3
        .mockResolvedValueOnce('no')   // Page 4
        .mockResolvedValueOnce('no');  // Page 5

      const pageList: PageToken[] = [
        { text: 'Table of Contents Part 1', tokenCount: 50 },
        { text: 'Content', tokenCount: 100 },
        { text: 'Table of Contents Part 2', tokenCount: 50 },
        { text: 'More content', tokenCount: 100 },
        { text: 'Even more content', tokenCount: 100 },
      ];

      // Act
      const result = await findTocPages(pageList, 10, 'gpt-4o');

      // Assert
      expect(result).toEqual([1, 3]);
    });

    it('应该处理空页面列表', async () => {
      // Arrange
      const pageList: PageToken[] = [];

      // Act
      const result = await findTocPages(pageList, 10, 'gpt-4o');

      // Assert
      expect(result).toEqual([]);
    });

    it('应该限制检查的页数', async () => {
      // Arrange
      const { ChatGPT_API } = await import('../../../src/utils/openai.js');
      vi.mocked(ChatGPT_API)
        .mockResolvedValueOnce('yes')
        .mockResolvedValueOnce('yes')
        .mockResolvedValueOnce('no')
        .mockResolvedValueOnce('no')
        .mockResolvedValueOnce('no');

      const pageList: PageToken[] = [
        { text: 'TOC 1', tokenCount: 50 },
        { text: 'TOC 2', tokenCount: 50 },
        { text: 'Content 1', tokenCount: 100 },
        { text: 'Content 2', tokenCount: 100 },
        { text: 'Content 3', tokenCount: 100 },
        { text: 'Should not check', tokenCount: 100 },
      ];

      // Act - only check first 5 pages
      const result = await findTocPages(pageList, 5, 'gpt-4o');

      // Assert
      expect(result).toEqual([1, 2]);
      expect(ChatGPT_API).toHaveBeenCalledTimes(5);
    });
  });
});
