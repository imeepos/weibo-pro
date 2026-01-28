import { describe, it, expect } from 'vitest';
import { extractJson, getJsonContent } from '../../src/utils/json.js';

describe('extractJson', () => {
  it('应该提取纯净的JSON', () => {
    const json = '{"key": "value"}';
    const result = extractJson(json);
    expect(result).toEqual({ key: 'value' });
  });

  it('应该处理```json包裹', () => {
    const text = '```json\n{"key": "value"}\n```';
    const result = extractJson(text);
    expect(result).toEqual({ key: 'value' });
  });

  it('应该将None转换为null', () => {
    const json = '{"key": None}';
    const result = extractJson(json);
    expect(result).toEqual({ key: null });
  });

  it('应该清理多余空白', () => {
    const json = '{  "key"  :  "value"  }';
    const result = extractJson(json);
    expect(result).toEqual({ key: 'value' });
  });

  it('应该处理尾随逗号', () => {
    const json = '{"key": "value",}';
    const result = extractJson(json);
    expect(result).toEqual({ key: 'value' });
  });

  it('应该处理复杂嵌套结构', () => {
    const json = '{"items": [{"id": 1}, {"id": 2,}]}';
    const result = extractJson(json);
    expect(result.items).toHaveLength(2);
  });
});

describe('getJsonContent', () => {
  it('应该提取```json代码块内容', () => {
    const text = 'Text before\n```json\n{"key": "value"}\n```\nText after';
    const result = getJsonContent(text);
    expect(result).toBe('{"key": "value"}');
  });

  it('应该处理没有json标记的代码块', () => {
    const text = '```\n{"key": "value"}\n```';
    const result = getJsonContent(text);
    expect(result).toBe('{"key": "value"}');
  });
});
