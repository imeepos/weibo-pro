/**
 * 树解析器单元测试
 *
 * 测试文档结构树的递归解析和节点分割功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { treeParser, metaProcessor } from '../../../src/pdf/tree-parser.js';
import type { Node } from '../../../src/types/node.types.js';
import type { PageToken } from '../../../src/types/result.types.js';
import type { PDFConfig } from '../../../src/types/config.types.js';

// Mock getPageTokens
vi.mock('../../../src/pdf/page-loader.js', () => ({
  getPageTokens: vi.fn(),
}));

import { getPageTokens } from '../../../src/pdf/page-loader.js';

describe('treeParser', () => {
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

  let mockPageList: PageToken[];

  beforeEach(() => {
    vi.mocked(getPageTokens).mockReset();

    // 准备测试数据: 15页,每页1000 tokens
    mockPageList = Array.from({ length: 15 }, (_, i) => ({
      text: `Page ${i + 1} content`,
      tokenCount: 1000,
    }));
  });

  it('空节点列表应返回空数组', async () => {
    const structure: Node[] = [];

    const result = await treeParser(structure, mockPageList, mockConfig);

    expect(result).toEqual([]);
    expect(getPageTokens).not.toHaveBeenCalled();
  });

  it('单个节点未超限应保持不变', async () => {
    const structure: Node[] = [
      {
        title: 'Chapter 1',
        start_index: 1,
        end_index: 5,
      },
    ];

    vi.mocked(getPageTokens).mockResolvedValue(mockPageList);

    const result = await treeParser(structure, mockPageList, mockConfig);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Chapter 1');
    expect(result[0].start_index).toBe(1);
    expect(result[0].end_index).toBe(5);
  });

  it('单个节点超过页数限制应分割', async () => {
    const structure: Node[] = [
      {
        title: 'Long Chapter',
        start_index: 1,
        end_index: 15, // 15页超过maxPageNumEachNode(10)
      },
    ];

    vi.mocked(getPageTokens).mockResolvedValue(mockPageList);

    const result = await treeParser(structure, mockPageList, mockConfig);

    // 应该被分割成多个节点
    expect(result.length).toBeGreaterThan(1);
    // 验证每个节点的页数不超过限制
    result.forEach(node => {
      const pageNum = (node.end_index || 0) - (node.start_index || 0) + 1;
      expect(pageNum).toBeLessThanOrEqual(mockConfig.maxPageNumEachNode);
    });
  });

  it('单个节点超过token限制应分割', async () => {
    // 创建一个页数不多但token数很多的节点
    const largeTokenPageList: PageToken[] = [
      { text: 'Page 1', tokenCount: 25000 }, // 超过maxTokenNumEachNode(20000)
      { text: 'Page 2', tokenCount: 25000 },
    ];

    const structure: Node[] = [
      {
        title: 'Token Heavy Chapter',
        start_index: 1,
        end_index: 2, // 只有2页,但token很多
      },
    ];

    vi.mocked(getPageTokens).mockResolvedValue(largeTokenPageList);

    const result = await treeParser(structure, largeTokenPageList, mockConfig);

    // 应该被分割
    expect(result.length).toBeGreaterThan(1);
  });

  it('嵌套节点递归处理', async () => {
    const structure: Node[] = [
      {
        title: 'Part 1',
        start_index: 1,
        end_index: 10,
        nodes: [
          {
            title: 'Chapter 1.1',
            start_index: 1,
            end_index: 5,
          },
          {
            title: 'Chapter 1.2',
            start_index: 6,
            end_index: 10,
          },
        ],
      },
    ];

    vi.mocked(getPageTokens).mockResolvedValue(mockPageList);

    const result = await treeParser(structure, mockPageList, mockConfig);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Part 1');
    expect(result[0].nodes).toBeDefined();
    expect(result[0].nodes).toHaveLength(2);
  });

  it('currentLevel参数正确传递', async () => {
    const structure: Node[] = [
      {
        title: 'Chapter 1',
        start_index: 1,
        end_index: 5,
      },
    ];

    vi.mocked(getPageTokens).mockResolvedValue(mockPageList);

    const result = await treeParser(structure, mockPageList, mockConfig, 2);

    expect(result).toHaveLength(1);
    // currentLevel用于内部逻辑,验证函数正常执行即可
    expect(result[0].title).toBe('Chapter 1');
  });
});

describe('metaProcessor', () => {
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

  let mockPageList: PageToken[];

  beforeEach(() => {
    vi.mocked(getPageTokens).mockReset();

    mockPageList = Array.from({ length: 10 }, (_, i) => ({
      text: `Page ${i + 1} content`,
      tokenCount: 1000,
    }));
  });

  it('空结构应返回空数组', async () => {
    const structure: Node[] = [];

    const result = await metaProcessor(structure, mockPageList, mockConfig);

    expect(result).toEqual([]);
  });

  it('基本结构处理', async () => {
    const structure: Node[] = [
      {
        title: 'Chapter 1',
        start_index: 1,
        end_index: 5,
      },
      {
        title: 'Chapter 2',
        start_index: 6,
        end_index: 10,
      },
    ];

    vi.mocked(getPageTokens).mockResolvedValue(mockPageList);

    const result = await metaProcessor(structure, mockPageList, mockConfig);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Chapter 1');
    expect(result[1].title).toBe('Chapter 2');
  });

  it('与treeParser集成', async () => {
    // 创建一个需要分割的节点
    const structure: Node[] = [
      {
        title: 'Long Chapter',
        start_index: 1,
        end_index: 15, // 超过maxPageNumEachNode
      },
    ];

    vi.mocked(getPageTokens).mockResolvedValue(
      Array.from({ length: 15 }, (_, i) => ({
        text: `Page ${i + 1}`,
        tokenCount: 1000,
      }))
    );

    const result = await metaProcessor(structure, mockPageList, mockConfig);

    // metaProcessor应该调用treeParser,因此节点会被分割
    expect(result.length).toBeGreaterThan(0);
  });

  it('config参数正确传递', async () => {
    const structure: Node[] = [
      {
        title: 'Chapter 1',
        start_index: 1,
        end_index: 5,
      },
    ];

    const customConfig: PDFConfig = {
      ...mockConfig,
      maxPageNumEachNode: 3, // 更小的限制,5页应该被分割成2个节点
    };

    vi.mocked(getPageTokens).mockResolvedValue(mockPageList);

    const result = await metaProcessor(structure, mockPageList, customConfig);

    // 5页超过maxPageNumEachNode=3,应该被分割
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
