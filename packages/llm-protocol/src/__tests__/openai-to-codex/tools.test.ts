import { describe, it, expect } from 'vitest';
import type { OpenAIMessage } from '../../adaptors/types/openai';
import type {
  CodexFunctionTool,
  CodexParameterProperty,
} from '../../adaptors/types/codex';
import { createConverter } from './helpers';

describe('OpenAIToCodexConverter', () => {
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
});
