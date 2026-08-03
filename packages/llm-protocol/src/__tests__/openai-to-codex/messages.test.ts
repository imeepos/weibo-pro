import { describe, it, expect } from 'vitest';
import { CODEX_PROMPT } from '../../adaptors/tokens';
import type { OpenAIRequest } from '../../adaptors/types/openai';
import { UUID_REGEX, createConverter } from './helpers';

describe('OpenAIToCodexConverter', () => {
  describe('基本转换结构', () => {
    it('生成完整的 CodexRequest 结构', () => {
      const converter = createConverter();
      const request: OpenAIRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
        stream: false,
      };

      const result = converter.convert(request);

      expect(result).toBeTypeOf('object');
      expect(result.model).toBe('gpt-4o');
      expect(result.instructions).toBe(CODEX_PROMPT);
      expect(result.instructions.length).toBeGreaterThan(0);
      expect(Array.isArray(result.input)).toBe(true);
      expect(result.tools).toEqual([]);
      expect(result.tool_choice).toBe('auto');
      expect(result.parallel_tool_calls).toBe(true);
      expect(result.reasoning).toEqual({ effort: 'high', summary: 'auto' });
      expect(result.store).toBe(false);
      expect(result.stream).toBe(false);
      expect(result.include).toEqual(['reasoning.encrypted_content']);
      expect(result.text).toEqual({ verbosity: 'low' });
      expect(result.prompt_cache_key).toMatch(UUID_REGEX);
    });

    it('stream 缺省时默认为 true', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
      });

      expect(result.stream).toBe(true);
    });
  });

  describe('system 消息合并', () => {
    it('单条 system 消息作为前导 user 消息插入', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          { role: 'system', content: 'You are a test system.' },
          { role: 'user', content: 'Hello' },
        ],
      });

      expect(result.input[0]).toEqual({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'You are a test system.' }],
      });
      expect(result.input[1]).toEqual({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'Hello' }],
      });
    });

    it('多条 system 消息以 \\n\\n 连接', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          { role: 'system', content: 'Part A' },
          { role: 'system', content: 'Part B' },
          { role: 'user', content: 'Hi' },
        ],
      });

      expect(result.input[0]).toEqual({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'Part A\n\nPart B' }],
      });
    });

    it('无 system 消息时插入默认占位 user 消息', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.input[0]).toEqual({
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'You are a helpful assistant.' },
        ],
      });
    });

    it('system 内容为数组时抽取 text 部分', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          {
            role: 'system',
            content: [{ type: 'text', text: 'System A' }],
          },
          { role: 'user', content: 'Hi' },
        ],
      });

      expect(result.input[0]).toEqual({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'System A' }],
      });
    });
  });

  describe('多消息顺序保持', () => {
    it('user/assistant 混合消息顺序保持', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          { role: 'user', content: 'one' },
          { role: 'assistant', content: 'two' },
          { role: 'user', content: 'three' },
        ],
      });

      const items = result.input;
      // input[0] 是占位 user 消息
      expect(items).toHaveLength(4);
      expect(items[1]).toEqual({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'one' }],
      });
      expect(items[2]).toEqual({
        type: 'message',
        role: 'assistant',
        content: [{ type: 'input_text', text: 'two' }],
      });
      expect(items[3]).toEqual({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'three' }],
      });
    });
  });
});
