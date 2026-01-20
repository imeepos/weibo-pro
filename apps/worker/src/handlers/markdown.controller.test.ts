import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownController, MarkdownRequest, MarkdownResponse } from '@sker/sdk';

/**
 * Markdown Controller 测试
 *
 * TDD 流程：
 * 1. RED - 写测试，观察失败
 * 2. GREEN - 实现最小代码让测试通过
 * 3. REFACTOR - 重构
 */

describe('MarkdownController', () => {
  let controller: MarkdownController;

  beforeEach(() => {
    controller = new MarkdownController();
  });

  describe('convertToMarkdown', () => {
    /**
     * RED 阶段 - 测试应该失败，因为方法未实现
     * 注意：SDK 中方法同步抛出错误，所以使用普通 expect 而不是 rejects
     */
    it('应该将 URL 转换为 Markdown', async () => {
      const request: MarkdownRequest = {
        url: 'https://example.com'
      };

      // 此时应该抛出 "not implements" 错误
      expect(() => controller.convertToMarkdown(request)).toThrow(/not implements/i);
    });

    it('应该将 HTML 转换为 Markdown', async () => {
      const request: MarkdownRequest = {
        html: '<div>Hello World</div>'
      };

      expect(() => controller.convertToMarkdown(request)).toThrow(/not implements/i);
    });

    it('应该支持 rejectRequestPattern 参数', async () => {
      const request: MarkdownRequest = {
        url: 'https://example.com',
        rejectRequestPattern: ['/^.*\\.(css)/']
      };

      expect(() => controller.convertToMarkdown(request)).toThrow(/not implements/i);
    });

    it('应该支持 gotoOptions 参数', async () => {
      const request: MarkdownRequest = {
        url: 'https://example.com',
        gotoOptions: {
          waitUntil: 'networkidle0',
          timeout: 30000
        }
      };

      expect(() => controller.convertToMarkdown(request)).toThrow(/not implements/i);
    });

    it('应该支持 waitForSelector 参数', async () => {
      const request: MarkdownRequest = {
        url: 'https://example.com',
        waitForSelector: '.content'
      };

      expect(() => controller.convertToMarkdown(request)).toThrow(/not implements/i);
    });

    it('应该支持自定义 userAgent', async () => {
      const request: MarkdownRequest = {
        url: 'https://example.com',
        userAgent: 'CustomBot/1.0'
      };

      expect(() => controller.convertToMarkdown(request)).toThrow(/not implements/i);
    });

    /**
     * 验证 RED - 确认测试因为功能缺失而失败（不是因为语法错误）
     * 运行测试后，应该看到所有测试都失败，错误信息是 "not implements"
     */
  });
});
