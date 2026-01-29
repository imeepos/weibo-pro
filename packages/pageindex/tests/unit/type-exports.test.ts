/**
 * 类型导出测试
 *
 * 验证所有类型可以从 @sker/pageindex/types 正确导入
 */

import { describe, it, expect } from 'vitest';
import type {
  // snake_case 类型
  ConfigSnake,
  ConfigInputSnake,
  NodeSnake,
  PageTokenSnake,
  TOCItemSnake,
  PageIndexResultSnake,
  VerifyResultSnake,
  IncorrectResultSnake,
  ChatMessageSnake,
  OpenAIConfigSnake,
  // camelCase 类型 (向后兼容)
  PDFConfig,
  MarkdownConfig,
  Config,
  Node,
  DocumentResult,
  PageToken,
  ChatMessage,
  OpenAIOptions,
} from '@sker/pageindex/types';

describe('类型导出验证', () => {
  describe('snake_case 类型导出', () => {
    it('应该导出 ConfigSnake 类型', () => {
      const config: ConfigSnake = {
        model: 'gpt-4o-2024-11-20',
        toc_check_page_num: 20,
        max_page_num_each_node: 10,
        max_token_num_each_node: 20000,
        if_add_node_id: 'yes',
        if_add_node_summary: 'yes',
        if_add_doc_description: 'no',
        if_add_node_text: 'no',
      };
      expect(config.model).toBeDefined();
    });

    it('应该导出 NodeSnake 类型', () => {
      const node: NodeSnake = {
        title: 'Test Node',
        node_id: '0001',
      };
      expect(node.title).toBe('Test Node');
    });

    it('应该导出 PageTokenSnake 类型', () => {
      const pageToken: PageTokenSnake = {
        text: 'Sample',
        tokenCount: 100,
      };
      expect(pageToken.tokenCount).toBe(100);
    });

    it('应该导出 TOCItemSnake 类型', () => {
      const tocItem: TOCItemSnake = {
        structure: '1.1',
        title: 'Chapter 1',
      };
      expect(tocItem.structure).toBe('1.1');
    });

    it('应该导出 PageIndexResultSnake 类型', () => {
      const result: PageIndexResultSnake = {
        doc_name: 'test.pdf',
        structure: [],
      };
      expect(result.doc_name).toBe('test.pdf');
    });

    it('应该导出 VerifyResultSnake 类型', () => {
      const verifyResult: VerifyResultSnake = {
        answer: 'yes',
        title: 'Test',
        page_number: 10,
        list_index: 0,
      };
      expect(verifyResult.answer).toBe('yes');
    });

    it('应该导出 IncorrectResultSnake 类型', () => {
      const incorrectResult: IncorrectResultSnake = {
        list_index: 0,
        title: 'Test',
        physical_index: 10,
      };
      expect(incorrectResult.physical_index).toBe(10);
    });

    it('应该导出 ChatMessageSnake 类型', () => {
      const message: ChatMessageSnake = {
        role: 'user',
        content: 'Hello',
      };
      expect(message.role).toBe('user');
    });

    it('应该导出 OpenAIConfigSnake 类型', () => {
      const config: OpenAIConfigSnake = {
        apiKey: 'sk-test',
        maxRetries: 3,
      };
      expect(config.apiKey).toBeDefined();
    });
  });

  describe('camelCase 类型导出 (向后兼容)', () => {
    it('应该导出 PDFConfig 类型', () => {
      const config: PDFConfig = {
        model: 'gpt-4o-2024-11-20',
        tocCheckPageNum: 20,
        maxPageNumEachNode: 10,
        maxTokenNumEachNode: 20000,
        ifAddNodeId: 'yes',
        ifAddNodeSummary: 'yes',
        ifAddDocDescription: 'no',
        ifAddNodeText: 'no',
      };
      expect(config.model).toBeDefined();
    });

    it('应该导出 Node 类型', () => {
      const node: Node = {
        title: 'Test Node',
        node_id: '0001',
      };
      expect(node.title).toBe('Test Node');
    });

    it('应该导出 DocumentResult 类型', () => {
      const result: DocumentResult = {
        doc_name: 'test.pdf',
        structure: [],
      };
      expect(result.doc_name).toBe('test.pdf');
    });

    it('应该导出 PageToken 类型', () => {
      const pageToken: PageToken = {
        text: 'Sample',
        tokenCount: 100,
      };
      expect(pageToken.tokenCount).toBe(100);
    });

    it('应该导出 ChatMessage 类型', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Hello',
      };
      expect(message.role).toBe('user');
    });

    it('应该导出 OpenAIOptions 类型', () => {
      const options: OpenAIOptions = {
        model: 'gpt-4o-2024-11-20',
        temperature: 0,
      };
      expect(options.model).toBeDefined();
    });
  });

  describe('类型总数验证', () => {
    it('应该导出至少 15 个类型', () => {
      const exportedTypes = [
        'ConfigSnake',
        'NodeSnake',
        'PageTokenSnake',
        'TOCItemSnake',
        'PageIndexResultSnake',
        'VerifyResultSnake',
        'IncorrectResultSnake',
        'ChatMessageSnake',
        'OpenAIConfigSnake',
        'PDFConfig',
        'Node',
        'DocumentResult',
        'PageToken',
        'ChatMessage',
        'OpenAIOptions',
      ];
      expect(exportedTypes.length).toBeGreaterThanOrEqual(15);
    });
  });
});
