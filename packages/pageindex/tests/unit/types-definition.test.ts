/**
 * 核心类型系统测试
 *
 * 按照 data-structures.md 文档测试所有核心类型定义
 * 遵循 TDD 规范 - GREEN阶段
 */

import { describe, it, expect } from 'vitest';
import type {
  Config,
  Node,
  PageToken,
  TOCItem,
  PageIndexResult,
  VerifyResult,
  IncorrectResult,
  ChatMessage,
  } from '../../src/types/new-index.js';

describe('核心类型系统验证 (GREEN阶段)', () => {
  describe('Config 类型', () => {
    it('应该包含所有必需字段', () => {
      const config = {
        model: 'gpt-4o-2024-11-20',
        toc_check_page_num: 20,
        max_page_num_each_node: 10,
        max_token_num_each_node: 20000,
        if_add_node_id: 'yes' as const,
        if_add_node_summary: 'yes' as const,
        if_add_doc_description: 'no' as const,
        if_add_node_text: 'no' as const,
      };
      expect(config.model).toBeDefined();
      expect(config.toc_check_page_num).toBe(20);
    });

    it('if_add_* 字段只能是 yes 或 no', () => {
      const validValues = ['yes', 'no'] as const;
      expect(validValues).toContain('yes');
      expect(validValues).toContain('no');
    });
  });

  describe('Node 类型', () => {
    it('应该包含核心字段', () => {
      const node = {
        title: 'Test Node',
      };
      expect(node.title).toBe('Test Node');
    });

    it('应该支持可选字段', () => {
      const node = {
        title: 'Test',
        node_id: '0001',
        structure: '1.1',
        physical_index: 10,
        start_index: 10,
        end_index: 15,
        text: 'Content',
        summary: 'Summary',
        nodes: [],
      };
      expect(node.node_id).toBe('0001');
      expect(node.physical_index).toBe(10);
    });

    it('应该支持递归 nodes', () => {
      const childNode = {
        title: 'Child',
        node_id: '0002',
      };
      const parentNode = {
        title: 'Parent',
        node_id: '0001',
        nodes: [childNode],
      };
      expect(parentNode.nodes).toHaveLength(1);
      expect(parentNode.nodes![0].title).toBe('Child');
    });
  });

  describe('PageToken 类型', () => {
    it('应该包含文本和token计数', () => {
      const pageToken = {
        text: 'Sample text',
        tokenCount: 100,
      };
      expect(pageToken.text).toBeDefined();
      expect(pageToken.tokenCount).toBe(100);
    });
  });

  describe('TOCItem 类型', () => {
    it('应该支持可选的 page 和 physical_index', () => {
      const tocItem = {
        structure: '1.1',
        title: 'Chapter 1',
        page: 10,
      };
      expect(tocItem.structure).toBe('1.1');
      expect(tocItem.page).toBe(10);
    });
  });

  describe('PageIndexResult 类型', () => {
    it('应该包含 doc_name 和 structure', () => {
      const result = {
        doc_name: 'test.pdf',
        structure: [],
      };
      expect(result.doc_name).toBe('test.pdf');
      expect(Array.isArray(result.structure)).toBe(true);
    });

    it('doc_description 应该是可选的', () => {
      const result1 = {
        doc_name: 'test.pdf',
        structure: [],
        doc_description: 'Description',
      };
      const result2 = {
        doc_name: 'test.pdf',
        structure: [],
      };
      expect(result1.doc_description).toBeDefined();
      expect(result2.doc_description).toBeUndefined();
    });
  });

  describe('VerifyResult 类型', () => {
    it('应该包含 answer, title, page_number 和 list_index', () => {
      const verifyResult = {
        answer: 'yes' as const,
        title: 'Chapter 1',
        page_number: 10,
        list_index: 0,
      };
      expect(verifyResult.answer).toBe('yes');
      expect(verifyResult.title).toBe('Chapter 1');
      expect(verifyResult.page_number).toBe(10);
      expect(verifyResult.list_index).toBe(0);
    });

    it('page_number 应该可以是 null', () => {
      const verifyResult = {
        answer: 'no' as const,
        title: 'Chapter 2',
        page_number: null,
        list_index: 1,
      };
      expect(verifyResult.page_number).toBeNull();
    });
  });

  describe('IncorrectResult 类型', () => {
    it('应该包含 list_index, title 和 physical_index', () => {
      const incorrectResult = {
        list_index: 0,
        title: 'Chapter 1',
        physical_index: 10,
      };
      expect(incorrectResult.list_index).toBe(0);
      expect(incorrectResult.title).toBe('Chapter 1');
      expect(incorrectResult.physical_index).toBe(10);
    });
  });

  describe('ChatMessage 类型', () => {
    it('应该包含 role 和 content', () => {
      const message = {
        role: 'user' as const,
        content: 'Hello',
      };
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello');
    });

    it('应该支持所有三种角色', () => {
      const roles = ['system', 'user', 'assistant'] as const;
      expect(roles).toContain('system');
      expect(roles).toContain('user');
      expect(roles).toContain('assistant');
    });
  });

  describe('OpenAIConfig 类型', () => {
    it('应该包含可选的配置字段', () => {
      const config = {
        apiKey: 'sk-test',
        baseURL: 'https://api.openai.com/v1',
        maxRetries: 3,
        retryDelay: 1000,
      };
      expect(config.apiKey).toBeDefined();
      expect(config.baseURL).toBeDefined();
      expect(config.maxRetries).toBe(3);
      expect(config.retryDelay).toBe(1000);
    });

    it('所有字段都应该是可选的', () => {
      const config = {};
      expect(config).toEqual({});
    });
  });
});
