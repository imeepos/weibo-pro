/**
 * PDF主入口函数单元测试
 *
 * 测试完整的PDF文档索引生成流程
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { page_index_main } from '../../../src/pdf/page-index.js';
import type { PDFConfig } from '../../../src/types/config.types.js';

// Mock所有依赖模块
vi.mock('../../../src/pdf/page-loader.js', () => ({
  getPageTokens: vi.fn(),
}));

vi.mock('../../../src/pdf/toc-detector.js', () => ({
  findTocPages: vi.fn(),
}));

vi.mock('../../../src/pdf/toc-extractor.js', () => ({
  tocTransformer: vi.fn(),
}));

vi.mock('../../../src/pdf/toc-validator.js', () => ({
  verifyToc: vi.fn(),
  fixIncorrectToc: vi.fn(),
}));

vi.mock('../../../src/pdf/tree-parser.js', () => ({
  metaProcessor: vi.fn(),
}));

import { getPageTokens } from '../../../src/pdf/page-loader.js';
import { findTocPages } from '../../../src/pdf/toc-detector.js';
import { tocTransformer } from '../../../src/pdf/toc-extractor.js';
import { verifyToc, fixIncorrectToc } from '../../../src/pdf/toc-validator.js';
import { metaProcessor } from '../../../src/pdf/tree-parser.js';

describe('page_index_main', () => {
  const mockConfig: PDFConfig = {
    model: 'gpt-4o',
    tocCheckPageNum: 20,
    maxPageNumEachNode: 10,
    maxTokenNumEachNode: 20000,
    ifAddNodeId: 'yes',
    ifAddNodeSummary: 'yes',
    ifAddDocDescription: 'no',
    ifAddNodeText: 'no',
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('有TOC+有页码模式', async () => {
    const pdfPath = '/path/to/document.pdf';

    // Mock数据
    const mockPageList = [
      { text: 'Page 1', tokenCount: 1000 },
      { text: 'Page 2', tokenCount: 1000 },
    ];

    const mockTOCResult = {
      toc_content: 'Table of Contents content',
      toc_page_list: [1],
      page_index_given_in_toc: 'yes' as const,
    };

    const mockTOCStructure = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 },
      { title: 'Chapter 2', structure: '2', physical_index: 2, list_index: 1 },
    ];

    const mockProcessedTOC = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, appear_start: 'yes' as const },
      { title: 'Chapter 2', structure: '2', physical_index: 2, appear_start: 'yes' as const },
    ];

    const mockNodes = [
      {
        title: 'Chapter 1',
        start_index: 1,
        end_index: 1,
      },
      {
        title: 'Chapter 2',
        start_index: 2,
        end_index: 2,
      },
    ];

    // 设置mock返回值
    vi.mocked(getPageTokens).mockResolvedValue(mockPageList);
    vi.mocked(findTocPages).mockResolvedValue([1]); // 返回页码数组
    vi.mocked(tocTransformer).mockResolvedValue(mockTOCStructure);
    vi.mocked(verifyToc).mockResolvedValue(100);
    vi.mocked(fixIncorrectToc).mockResolvedValue(mockProcessedTOC);
    vi.mocked(metaProcessor).mockResolvedValue(mockNodes);

    const result = await page_index_main(pdfPath, mockConfig);

    // 验证结果
    expect(result).toBeDefined();
    expect(result.doc_name).toBeDefined();
    expect(result.structure).toEqual(mockNodes);

    // 验证调用链
    expect(getPageTokens).toHaveBeenCalledWith(pdfPath, mockConfig.model);
    expect(findTocPages).toHaveBeenCalledWith(mockPageList, mockConfig.tocCheckPageNum, mockConfig.model);
    expect(tocTransformer).toHaveBeenCalled();
    expect(verifyToc).toHaveBeenCalled();
    expect(fixIncorrectToc).toHaveBeenCalled();
    expect(metaProcessor).toHaveBeenCalled();
  });

  it('有TOC+无页码模式', async () => {
    const pdfPath = '/path/to/document.pdf';

    const mockPageList = [
      { text: 'Page 1', tokenCount: 1000 },
    ];

    const mockTOCResult = {
      toc_content: 'TOC without page numbers',
      toc_page_list: [1],
      page_index_given_in_toc: 'no' as const,
    };

    const mockTOCStructure = [
      { title: 'Chapter 1', structure: '1', list_index: 0 },
    ];

    const mockNodes = [
      {
        title: 'Chapter 1',
        start_index: 1,
        end_index: 1,
      },
    ];

    vi.mocked(getPageTokens).mockResolvedValue(mockPageList);
    vi.mocked(findTocPages).mockResolvedValue(mockTOCResult);
    vi.mocked(tocTransformer).mockResolvedValue(mockTOCStructure);
    vi.mocked(metaProcessor).mockResolvedValue(mockNodes);

    const result = await page_index_main(pdfPath, mockConfig);

    expect(result).toBeDefined();
    expect(result.structure).toEqual(mockNodes);

    // 无页码模式不调用verifyToc和fixIncorrectToc
    expect(verifyToc).not.toHaveBeenCalled();
    expect(fixIncorrectToc).not.toHaveBeenCalled();
  });

  it('无TOC模式', async () => {
    const pdfPath = '/path/to/document.pdf';

    const mockPageList = [
      { text: 'Page 1', tokenCount: 1000 },
      { text: 'Page 2', tokenCount: 1000 },
    ];

    const mockTOCResult = {
      toc_content: null,
      toc_page_list: [],
      page_index_given_in_toc: 'no' as const,
    };

    const mockNodes = [
      {
        title: 'Document',
        start_index: 1,
        end_index: 2,
      },
    ];

    vi.mocked(getPageTokens).mockResolvedValue(mockPageList);
    vi.mocked(findTocPages).mockResolvedValue(mockTOCResult);
    vi.mocked(metaProcessor).mockResolvedValue(mockNodes);

    const result = await page_index_main(pdfPath, mockConfig);

    expect(result).toBeDefined();
    expect(result.structure).toEqual(mockNodes);

    // 无TOC模式不调用TOC相关函数
    expect(tocTransformer).not.toHaveBeenCalled();
    expect(verifyToc).not.toHaveBeenCalled();
    expect(fixIncorrectToc).not.toHaveBeenCalled();
    // 但应该调用metaProcessor处理整个文档
    expect(metaProcessor).toHaveBeenCalled();
  });

  it('正确设置文档名称', async () => {
    const pdfPath = '/path/to/MyDocument.pdf';

    const mockPageList = [{ text: 'Page 1', tokenCount: 1000 }];
    const mockTOCResult = {
      toc_content: null,
      toc_page_list: [],
      page_index_given_in_toc: 'no' as const,
    };
    const mockNodes = [{ title: 'Doc', start_index: 1, end_index: 1 }];

    vi.mocked(getPageTokens).mockResolvedValue(mockPageList);
    vi.mocked(findTocPages).mockResolvedValue(mockTOCResult);
    vi.mocked(metaProcessor).mockResolvedValue(mockNodes);

    const result = await page_index_main(pdfPath, mockConfig);

    expect(result.doc_name).toBe('MyDocument');
  });

  it('完整流程集成', async () => {
    const pdfPath = '/path/to/document.pdf';

    const mockPageList = Array.from({ length: 5 }, (_, i) => ({
      text: `Page ${i + 1}`,
      tokenCount: 1000,
    }));

    const mockTOCResult = {
      toc_content: 'Chapter 1\nChapter 2',
      toc_page_list: [1],
      page_index_given_in_toc: 'yes' as const,
    };

    const mockTOCStructure = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 },
      { title: 'Chapter 2', structure: '2', physical_index: 3, list_index: 1 },
    ];

    const mockFixedTOC = [
      { title: 'Chapter 1', structure: '1', physical_index: 1, appear_start: 'yes' as const },
      { title: 'Chapter 2', structure: '2', physical_index: 3, appear_start: 'yes' as const },
    ];

    const mockNodes = [
      { title: 'Chapter 1', start_index: 1, end_index: 2 },
      { title: 'Chapter 2', start_index: 3, end_index: 5 },
    ];

    vi.mocked(getPageTokens).mockResolvedValue(mockPageList);
    vi.mocked(findTocPages).mockResolvedValue([1]); // 返回页码数组
    vi.mocked(tocTransformer).mockResolvedValue(mockTOCStructure);
    vi.mocked(verifyToc).mockResolvedValue(100);
    vi.mocked(fixIncorrectToc).mockResolvedValue(mockFixedTOC);
    vi.mocked(metaProcessor).mockResolvedValue(mockNodes);

    const result = await page_index_main(pdfPath, mockConfig);

    // 验证完整流程
    expect(getPageTokens).toHaveBeenCalledTimes(1);
    expect(findTocPages).toHaveBeenCalledTimes(1);
    expect(tocTransformer).toHaveBeenCalledTimes(1);
    expect(verifyToc).toHaveBeenCalledTimes(1);
    expect(fixIncorrectToc).toHaveBeenCalledTimes(1);
    expect(metaProcessor).toHaveBeenCalledTimes(1);

    expect(result).toMatchObject({
      doc_name: 'document',
      structure: mockNodes,
    });
  });
});
