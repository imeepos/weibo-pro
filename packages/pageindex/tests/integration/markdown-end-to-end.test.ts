import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { md_to_tree } from '../../src/markdown/page-index-md.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Markdown处理端到端测试', () => {
  const mockOptions = {
    ifThinning: false,
    minTokenThreshold: 5000,
    ifAddNodeSummary: true,
    summaryTokenThreshold: 200,
    model: 'gpt-4o-2024-11-20',
    ifAddDocDescription: false,
    ifAddNodeText: false,
    ifAddNodeId: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('完整Markdown处理流程', () => {
    it('应该完整处理一个简单的Markdown文档', async () => {
      const testMdPath = join(process.cwd(), 'tests/fixtures/sample.md');

      const result = await md_to_tree(
        testMdPath,
        mockOptions.ifThinning,
        mockOptions.minTokenThreshold,
        mockOptions.ifAddNodeSummary,
        mockOptions.summaryTokenThreshold,
        mockOptions.model,
        mockOptions.ifAddDocDescription,
        mockOptions.ifAddNodeText,
        mockOptions.ifAddNodeId
      );

      // 验证基本结构
      expect(result).toHaveProperty('doc_name');
      expect(result).toHaveProperty('structure');
      expect(Array.isArray(result.structure)).toBe(true);
    });

    it('应该正确提取多级标题', async () => {
      const testMdPath = join(process.cwd(), 'tests/fixtures/multi-level.md');

      const result = await md_to_tree(
        testMdPath,
        false, // ifThinning
        5000,
        false, // ifAddNodeSummary (关闭以避免API调用)
        200,
        mockOptions.model,
        false,
        false,
        true
      );

      // 验证基本结构
      expect(result).toHaveProperty('doc_name');
      expect(result).toHaveProperty('structure');
      expect(result.doc_name).toBe('multi-level');
    });

    it('应该正确处理空文档', async () => {
      const testMdPath = join(process.cwd(), 'tests/fixtures/empty.md');

      const result = await md_to_tree(
        testMdPath,
        mockOptions.ifThinning,
        mockOptions.minTokenThreshold,
        mockOptions.ifAddNodeSummary,
        mockOptions.summaryTokenThreshold,
        mockOptions.model,
        mockOptions.ifAddDocDescription,
        mockOptions.ifAddNodeText,
        mockOptions.ifAddNodeId
      );

      // 空文档也应该有基本结构
      expect(result).toHaveProperty('doc_name');
      expect(result).toHaveProperty('structure');
    });
  });

  describe('输出格式验证', () => {
    it('应该返回正确的输出格式', async () => {
      const testMdPath = join(process.cwd(), 'tests/fixtures/sample.md');

      const result = await md_to_tree(
        testMdPath,
        mockOptions.ifThinning,
        mockOptions.minTokenThreshold,
        mockOptions.ifAddNodeSummary,
        mockOptions.summaryTokenThreshold,
        mockOptions.model,
        mockOptions.ifAddDocDescription,
        mockOptions.ifAddNodeText,
        mockOptions.ifAddNodeId
      );

      // 验证必需字段
      expect(result).toMatchObject({
        doc_name: expect.any(String),
        structure: expect.any(Array),
      });

      // 验证文档名称
      expect(result.doc_name).toBeDefined();
      expect(typeof result.doc_name).toBe('string');
    });

    it('应该正确添加node_id', async () => {
      const testMdPath = join(process.cwd(), 'tests/fixtures/sample.md');

      const result = await md_to_tree(
        testMdPath,
        mockOptions.ifThinning,
        mockOptions.minTokenThreshold,
        mockOptions.ifAddNodeSummary,
        mockOptions.summaryTokenThreshold,
        mockOptions.model,
        mockOptions.ifAddDocDescription,
        mockOptions.ifAddNodeText,
        true // ifAddNodeId
      );

      // 验证节点ID格式
      const checkNodeId = (nodes: any[]) => {
        for (const node of nodes) {
          if (mockOptions.ifAddNodeId) {
            expect(node).toHaveProperty('node_id');
            expect(node.node_id).toMatch(/^\d{4}$/);
          }
          if (node.nodes && node.nodes.length > 0) {
            checkNodeId(node.nodes);
          }
        }
      };

      checkNodeId(result.structure);
    });

    it('应该正确处理错误情况', async () => {
      const invalidPath = join(process.cwd(), 'tests/fixtures/non-existent.md');

      await expect(
        md_to_tree(
          invalidPath,
          mockOptions.ifThinning,
          mockOptions.minTokenThreshold,
          mockOptions.ifAddNodeSummary,
          mockOptions.summaryTokenThreshold,
          mockOptions.model,
          mockOptions.ifAddDocDescription,
          mockOptions.ifAddNodeText,
          mockOptions.ifAddNodeId
        )
      ).rejects.toThrow();
    });
  });
});
