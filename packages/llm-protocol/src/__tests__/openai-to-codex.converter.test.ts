import { describe, it, expect } from 'vitest';
import { OpenAIToCodexConverter } from '../adaptors/openai-to-codex.converter';
import { CODEX_PROMPT } from '../adaptors/tokens';
import type {
  OpenAIRequest,
  OpenAIMessage,
} from '../adaptors/types/openai';
import type {
  CodexMessageInput,
  CodexFunctionCall,
  CodexFunctionCallOutput,
  CodexFunctionTool,
  CodexParameterProperty,
} from '../adaptors/types/codex';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createConverter(): OpenAIToCodexConverter {
  return new OpenAIToCodexConverter();
}

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

  describe('tools 转换', () => {
    it('基础 tool 字段映射', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [{ role: 'user', content: 'hi' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather',
              parameters: {
                type: 'object',
                properties: {},
              },
            },
          },
        ],
      });

      expect(result.tools).toHaveLength(1);
      const tool = result.tools[0] as CodexFunctionTool | undefined;
      expect(tool!.type).toBe('function');
      expect(tool!.name).toBe('get_weather');
      expect(tool!.description).toBe('Get weather');
      expect(tool!.strict).toBe(false);
      expect(tool!.parameters.type).toBe('object');
      expect(tool!.parameters.properties).toEqual({});
    });

    it('description 缺省时为空字符串', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [{ role: 'user', content: 'hi' }],
        tools: [
          {
            type: 'function',
            function: { name: 'f', parameters: {} },
          },
        ],
      });

      expect((result.tools[0] as CodexFunctionTool).description).toBe('');
    });

    it('parameters 缺失时返回空对象参数', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [{ role: 'user', content: 'hi' }],
        tools: [
          {
            type: 'function',
            function: { name: 'f' },
          },
        ],
      });

      expect((result.tools[0] as CodexFunctionTool).parameters).toEqual({
        type: 'object',
        properties: {},
      });
    });

    it('完整的 parameters 嵌套转换', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages: [{ role: 'user', content: 'hi' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather',
              parameters: {
                type: 'object',
                properties: {
                  location: {
                    type: 'string',
                    description: 'City',
                    enum: ['SF', 'NYC'],
                    minLength: 2,
                  },
                  temp: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    default: 20,
                  },
                  unit: { type: 'string', format: 'lowercase' },
                  tags: { type: 'array', items: { type: 'string' } },
                  nested: {
                    type: 'object',
                    properties: {
                      a: { type: 'string' },
                      b: { type: 'integer' },
                    },
                    required: ['a'],
                    additionalProperties: false,
                  },
                },
                required: ['location'],
                additionalProperties: false,
              },
            },
          },
        ],
      });

      const tool = result.tools[0] as CodexFunctionTool | undefined;
      const params = tool!.parameters;
      expect(params.type).toBe('object');
      expect(params.required).toEqual(['location']);
      expect(params.additionalProperties).toBe(false);

      const properties = params.properties;
      const location = properties.location as CodexParameterProperty;
      expect(location.type).toBe('string');
      expect(location.description).toBe('City');
      expect(location.enum).toEqual(['SF', 'NYC']);
      expect(location.minLength).toBe(2);

      const temp = properties.temp as CodexParameterProperty;
      expect(temp.minimum).toBe(0);
      expect(temp.maximum).toBe(100);
      expect(temp.default).toBe(20);

      const unit = properties.unit as CodexParameterProperty;
      expect(unit.format).toBe('lowercase');

      const tags = properties.tags as CodexParameterProperty;
      expect(tags.items).toEqual({ type: 'string' });

      const nested = properties.nested as CodexParameterProperty;
      expect(nested.properties).toEqual({
        a: { type: 'string' },
        b: { type: 'integer' },
      });
      expect(nested.required).toEqual(['a']);
      expect(nested.additionalProperties).toBe(false);
    });
  });

  describe('tool_choice 转换', () => {
    const messages: OpenAIMessage[] = [{ role: 'user', content: 'hi' }];

    it("'none' 保持不变", () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages,
        tool_choice: 'none',
      });
      expect(result.tool_choice).toBe('none');
    });

    it("'auto' 保持不变", () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages,
        tool_choice: 'auto',
      });
      expect(result.tool_choice).toBe('auto');
    });

    it("undefined 时映射为 'auto'", () => {
      const converter = createConverter();
      const result = converter.convert({ model: 'm', messages });
      expect(result.tool_choice).toBe('auto');
    });

    it("'required' 映射为 'auto'", () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages,
        tool_choice: 'required',
      });
      expect(result.tool_choice).toBe('auto');
    });

    it('{function:{name}} 映射为具体工具名', () => {
      const converter = createConverter();
      const result = converter.convert({
        model: 'm',
        messages,
        tool_choice: {
          type: 'function',
          function: { name: 'get_weather' },
        },
      });
      expect(result.tool_choice).toBe('get_weather');
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
