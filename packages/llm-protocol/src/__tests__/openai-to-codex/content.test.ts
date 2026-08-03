import { describe, it, expect } from 'vitest';
import type { CodexMessageInput } from '../../adaptors/types/codex';
import { createConverter } from './helpers';

describe('OpenAIToCodexConverter', () => {
  describe('图片 content 转换', () => {
    it('image_url 转为 input_image', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'describe this' },
              {
                type: 'image_url',
                image_url: {
                  url: 'https://example.com/img.png',
                  detail: 'high',
                },
              },
            ],
          },
        ],
      });

      const userMessage = result.input[1] as CodexMessageInput | undefined;
      expect(userMessage!.content).toEqual([
        { type: 'input_text', text: 'describe this' },
        { type: 'input_image', image_url: 'https://example.com/img.png' },
      ]);
    });

    it('图片与文本混合时顺序保持', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: 'https://a.png' } },
              { type: 'text', text: 'after' },
            ],
          },
        ],
      });

      const userMessage = result.input[1] as CodexMessageInput | undefined;
      expect(userMessage!.content).toEqual([
        { type: 'input_image', image_url: 'https://a.png' },
        { type: 'input_text', text: 'after' },
      ]);
    });
  });

  describe('空消息过滤', () => {
    it('空字符串 / 空白 / null 内容消息被过滤', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          { role: 'user', content: '' },
          { role: 'user', content: '   ' },
          { role: 'assistant', content: null },
          { role: 'user', content: 'real' },
        ],
      });

      // input[0] 是占位 user 消息
      expect(result.input).toHaveLength(2);
      expect(result.input[1]).toEqual({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'real' }],
      });
    });

    it('content 数组中空 text 部分被过滤', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '' },
              { type: 'text', text: '   ' },
              { type: 'text', text: 'x' },
            ],
          },
        ],
      });

      const userMessage = result.input[1] as CodexMessageInput | undefined;
      expect(userMessage!.content).toEqual([
        { type: 'input_text', text: 'x' },
      ]);
    });

    it('未知 content part 被忽略，全部未知时消息整体被过滤', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          {
            role: 'user',
            content: [{ type: 'audio', url: 'x' } as never],
          },
        ],
      });

      // input 只保留占位 user 消息，原消息因无有效内容被过滤
      expect(result.input).toHaveLength(1);
      expect(result.input[0]).toEqual({
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'You are a helpful assistant.' },
        ],
      });
    });
  });
});
