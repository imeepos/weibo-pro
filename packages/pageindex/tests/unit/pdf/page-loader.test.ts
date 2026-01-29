import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPageTokens, extractPageText, getNumberOfPages } from '../../../src/pdf/page-loader.js';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
}));

// Mock countTokens
vi.mock('../../../src/utils/token.js', () => ({
  countTokens: vi.fn((text: string) => Math.ceil(text.length / 4)),
}));

describe('page-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPageTokens', () => {
    it('应该解析PDF并返回每页的文本和token数', async () => {
      // Arrange
      const { getDocument } = await import('pdfjs-dist');

      const mockPage1 = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'Page 1 content' }, { str: ' more text' }],
        }),
      };
      const mockPage2 = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'Page 2 content' }],
        }),
      };

      const mockPdfDoc = {
        numPages: 2,
        getPage: vi.fn()
          .mockResolvedValueOnce(mockPage1)
          .mockResolvedValueOnce(mockPage2),
      };

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc),
      } as any);

      // Act
      const result = await getPageTokens('test.pdf', 'gpt-4o');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('text');
      expect(result[0]).toHaveProperty('tokenCount');
      expect(result[0].text).toBe('Page 1 content  more text');
      expect(result[0].tokenCount).toBeGreaterThan(0);
    });

    it('应该正确计算每页的token数', async () => {
      // Arrange
      const { getDocument } = await import('pdfjs-dist');

      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'Test content with enough words' }],
        }),
      };

      const mockPdfDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
      };

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc),
      } as any);

      // Act
      const result = await getPageTokens('test.pdf', 'gpt-4o');

      // Assert
      expect(result[0].tokenCount).toBeGreaterThan(0);
      expect(typeof result[0].tokenCount).toBe('number');
    });

    it('应该处理不存在的文件', async () => {
      // Arrange
      const { getDocument } = await import('pdfjs-dist');

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.reject(new Error('File not found')),
      } as any);

      // Act & Assert
      await expect(getPageTokens('nonexistent.pdf')).rejects.toThrow('File not found');
    });

    it('应该处理空PDF', async () => {
      // Arrange
      const { getDocument } = await import('pdfjs-dist');

      const mockPdfDoc = {
        numPages: 0,
        getPage: vi.fn(),
      };

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc),
      } as any);

      // Act
      const result = await getPageTokens('empty.pdf', 'gpt-4o');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('应该处理页面内容为空的情况', async () => {
      // Arrange
      const { getDocument } = await import('pdfjs-dist');

      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [],
        }),
      };

      const mockPdfDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
      };

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc),
      } as any);

      // Act
      const result = await getPageTokens('test.pdf', 'gpt-4o');

      // Assert
      expect(result[0].text).toBe('');
      expect(result[0].tokenCount).toBe(0);
    });
  });

  describe('extractPageText', () => {
    it('应该提取指定页的文本', async () => {
      // Arrange
      const { getDocument } = await import('pdfjs-dist');

      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'Page 5 content' }],
        }),
      };

      const mockPdfDoc = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue(mockPage),
      };

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc),
      } as any);

      // Act
      const result = await extractPageText('test.pdf', 5);

      // Assert
      expect(result).toBe('Page 5 content');
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(5);
    });

    it('应该处理无效页码', async () => {
      // Arrange
      const { getDocument } = await import('pdfjs-dist');

      const mockPdfDoc = {
        numPages: 5,
        getPage: vi.fn().mockRejectedValue(new Error('Invalid page number')),
      };

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc),
      } as any);

      // Act & Assert
      await expect(extractPageText('test.pdf', 999)).rejects.toThrow();
    });

    it('应该处理负页码', async () => {
      // Arrange
      const { getDocument } = await import('pdfjs-dist');

      const mockPdfDoc = {
        numPages: 5,
        getPage: vi.fn().mockRejectedValue(new Error('Invalid page number')),
      };

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc),
      } as any);

      // Act & Assert
      await expect(extractPageText('test.pdf', -1)).rejects.toThrow();
    });
  });

  describe('getNumberOfPages', () => {
    it('应该返回正确的页数', async () => {
      // Arrange
      const { getDocument } = await import('pdfjs-dist');

      const mockPdfDoc = {
        numPages: 42,
      };

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc),
      } as any);

      // Act
      const result = await getNumberOfPages('test.pdf');

      // Assert
      expect(result).toBe(42);
    });

    it('应该处理单页PDF', async () => {
      // Arrange
      const { getDocument } = await import('pdfjs-dist');

      const mockPdfDoc = {
        numPages: 1,
      };

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdfDoc),
      } as any);

      // Act
      const result = await getNumberOfPages('single-page.pdf');

      // Assert
      expect(result).toBe(1);
    });

    it('应该处理不存在的文件', async () => {
      // Arrange
      const { getDocument } = await import('pdfjs-dist');

      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.reject(new Error('File not found')),
      } as any);

      // Act & Assert
      await expect(getNumberOfPages('nonexistent.pdf')).rejects.toThrow('File not found');
    });
  });
});
