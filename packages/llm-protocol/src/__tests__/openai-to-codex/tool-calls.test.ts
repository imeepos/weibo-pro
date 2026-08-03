import { describe, it, expect } from 'vitest';
import type { OpenAIRequest } from '../../adaptors/types/openai';
import type {
  CodexFunctionCall,
  CodexFunctionCallOutput,
} from '../../adaptors/types/codex';
import { UUID_REGEX, createConverter } from './helpers';

describe('OpenAIToCodexConverter', () => {
  describe('tool_calls / tool 消息转换', () => {
    it('tool_calls 转为 function_call 并生成 UUID call_id', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          { role: 'user', content: 'weather?' },
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_abc',
                type: 'function',
                function: { name: 'get_weather', arguments: '{"city":"SF"}' },
              },
            ],
          },
        ],
      });

      const call = result.input.find(
        (item) => item.type === 'function_call',
      ) as CodexFunctionCall | undefined;

      expect(call).toBeDefined();
      expect(call!.type).toBe('function_call');
      expect(call!.name).toBe('get_weather');
      expect(call!.arguments).toBe('{"city":"SF"}');
      expect(call!.call_id).toMatch(UUID_REGEX);
      expect(call!.call_id).not.toBe('call_abc');
    });

    it('tool 消息转为 function_call_output 且 call_id 与前面一致', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          { role: 'user', content: 'weather?' },
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_abc',
                type: 'function',
                function: { name: 'get_weather', arguments: '{"city":"SF"}' },
              },
            ],
          },
          { role: 'tool', tool_call_id: 'call_abc', content: 'sunny' },
        ],
      });

      const call = result.input.find(
        (item) => item.type === 'function_call',
      ) as CodexFunctionCall | undefined;
      const output = result.input.find(
        (item) => item.type === 'function_call_output',
      ) as CodexFunctionCallOutput | undefined;

      expect(call).toBeDefined();
      expect(output).toBeDefined();
      expect(output!.call_id).toBe(call!.call_id);
      expect(output!.output).toBe('sunny');
    });

    it('多个 tool_calls 各自生成独立 UUID 并保持配对', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          { role: 'user', content: 'weather?' },
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_a',
                type: 'function',
                function: { name: 'get_a', arguments: '{}' },
              },
              {
                id: 'call_b',
                type: 'function',
                function: { name: 'get_b', arguments: '{}' },
              },
            ],
          },
          { role: 'tool', tool_call_id: 'call_a', content: 'result-a' },
          { role: 'tool', tool_call_id: 'call_b', content: 'result-b' },
        ],
      });

      const calls = result.input.filter(
        (item): item is CodexFunctionCall => item.type === 'function_call',
      );
      const outputs = result.input.filter(
        (item): item is CodexFunctionCallOutput =>
          item.type === 'function_call_output',
      );

      expect(calls).toHaveLength(2);
      expect(outputs).toHaveLength(2);
      expect(calls[0]!.call_id).not.toBe(calls[1]!.call_id);
      expect(outputs[0]!.call_id).toBe(calls[0]!.call_id);
      expect(outputs[1]!.call_id).toBe(calls[1]!.call_id);
      expect(outputs[0]!.output).toBe('result-a');
      expect(outputs[1]!.output).toBe('result-b');
    });

    it('tool 消息缺 tool_call_id 时生成容错 UUID', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [{ role: 'tool', content: 'orphan result' }],
      });

      const output = result.input.find(
        (item) => item.type === 'function_call_output',
      ) as CodexFunctionCallOutput | undefined;

      expect(output).toBeDefined();
      expect(output!.call_id).toMatch(UUID_REGEX);
      expect(output!.output).toBe('orphan result');
    });

    it('tool 内容为数组时抽取 text 部分作为 output', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'f', arguments: '{}' },
              },
            ],
          },
          {
            role: 'tool',
            tool_call_id: 'call_1',
            content: [{ type: 'text', text: 'part-a' }],
          },
        ],
      });

      const output = result.input.find(
        (item) => item.type === 'function_call_output',
      ) as CodexFunctionCallOutput | undefined;

      expect(output!.output).toBe('part-a');
    });
  });

  describe('callIdMap 状态隔离', () => {
    it('连续两次 convert 生成全新 call_id', () => {
      const converter = createConverter();
      const request: OpenAIRequest = {
        model: 'm',
        messages: [
          { role: 'user', content: 'hi' },
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'f', arguments: '{}' },
              },
            ],
          },
          { role: 'tool', tool_call_id: 'call_1', content: 'res' },
        ],
      };

      const first = converter.convert(request);
      const second = converter.convert(request);

      const firstCall = first.input.find(
        (item) => item.type === 'function_call',
      ) as CodexFunctionCall | undefined;
      const secondCall = second.input.find(
        (item) => item.type === 'function_call',
      ) as CodexFunctionCall | undefined;
      const secondOutput = second.input.find(
        (item) => item.type === 'function_call_output',
      ) as CodexFunctionCallOutput | undefined;

      expect(secondCall!.call_id).toMatch(UUID_REGEX);
      expect(secondCall!.call_id).not.toBe(firstCall!.call_id);
      // 第二次转换内部配对仍然成立
      expect(secondOutput!.call_id).toBe(secondCall!.call_id);
    });
  });
});
