import { describe, it, expect, vi, beforeEach } from 'vitest';
import { md_to_tree } from '../../../src/markdown/page-index-md.js';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Mock OpenAI API
vi.mock('../../../src/utils/openai.js', () => ({
  ChatGPT_API_async: vi.fn(() => Promise.resolve('Mocked summary')),
}));

describe('md_to_tree', () => {
  const testMarkdown = `# Chapter 1

Content of chapter 1.

## Section 1.1

Content of section 1.1.

# Chapter 2

Content of chapter 2.`;

  let tempFilePath: string;

  beforeEach(() => {
    // 创建临时测试文件
    tempFilePath = join(tmpdir(), `test-${Date.now()}.md`);
    writeFileSync(tempFilePath, testMarkdown);
  });

  it('应该提取标题并构建树结构', async () => {
    const result = await md_to_tree(
      tempFilePath,
      false, // ifThinning
      500,   // minTokenThreshold
      false, // ifAddNodeSummary
      200,   // summaryTokenThreshold
      'gpt-4o',
      false, // ifAddDocDescription
      false, // ifAddNodeText
      false  // ifAddNodeId
    );

    expect(result.doc_name).toBeDefined();
    expect(result.structure).toBeDefined();
    expect(result.structure.length).toBeGreaterThan(0);
  });

  it('应该正确设置节点层级关系', async () => {
    const result = await md_to_tree(
      tempFilePath,
      false,
      500,
      false,
      200,
      'gpt-4o',
      false,
      false,
      false
    );

    // 应该有2个一级章节
    expect(result.structure).toHaveLength(2);
    expect(result.structure[0].title).toBe('Chapter 1');
    expect(result.structure[1].title).toBe('Chapter 2');

    // Chapter 1应该有1个子节
    expect(result.structure[0].nodes).toHaveLength(1);
    expect(result.structure[0].nodes![0].title).toBe('Section 1.1');
  });

  it('应该添加节点ID（如果启用）', async () => {
    const result = await md_to_tree(
      tempFilePath,
      false,
      500,
      false,
      200,
      'gpt-4o',
      false,
      false,
      true // ifAddNodeId
    );

    expect(result.structure[0].node_id).toBeDefined();
    expect(result.structure[0].node_id).toMatch(/^\d{4}$/);
  });

  it('应该保留文本内容（如果启用）', async () => {
    const result = await md_to_tree(
      tempFilePath,
      false,
      500,
      false,
      200,
      'gpt-4o',
      false,
      true, // ifAddNodeText
      false
    );

    expect(result.structure[0].text).toBeDefined();
    expect(result.structure[0].text).toContain('Content of chapter 1');
  });

  it('应该移除文本内容（如果禁用）', async () => {
    const result = await md_to_tree(
      tempFilePath,
      false,
      500,
      false,
      200,
      'gpt-4o',
      false,
      false, // ifAddNodeText
      false
    );

    expect(result.structure[0].text).toBeUndefined();
  });

  it('应该生成摘要（如果启用）', async () => {
    const result = await md_to_tree(
      tempFilePath,
      false,
      500,
      true, // ifAddNodeSummary
      200,
      'gpt-4o',
      false,
      false,
      false
    );

    // 检查叶子节点是否有摘要
    const leafNodes = result.structure.filter(n => !n.nodes || n.nodes.length === 0);
    if (leafNodes.length > 0) {
      expect(leafNodes[0].summary).toBeDefined();
    }
  });

  it('应该返回正确的文档名称', async () => {
    const result = await md_to_tree(
      tempFilePath,
      false,
      500,
      false,
      200,
      'gpt-4o',
      false,
      false,
      false
    );

    expect(result.doc_name).toMatch(/^test-\d+$/);
  });

  it('应该处理空文件', async () => {
    const emptyFilePath = join(tmpdir(), `empty-${Date.now()}.md`);
    writeFileSync(emptyFilePath, '');

    const result = await md_to_tree(
      emptyFilePath,
      false,
      500,
      false,
      200,
      'gpt-4o',
      false,
      false,
      false
    );

    expect(result.structure).toHaveLength(0);
  });
});
