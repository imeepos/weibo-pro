import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  OpenAIRequest,
  CodexRequest,
  ClaudeRequest,
  OpenAIToCodexConverter,
} from '@sker/llm-protocol';
import { OpenAIToCodexConverter as SourceConverter } from '../adaptors/openai-to-codex.converter';
import type { OpenAIRequest as SourceOpenAIRequest } from '../adaptors/types/openai';
import type { CodexRequest as SourceCodexRequest } from '../adaptors/types/codex';

describe('类型契约', () => {
  it('关键类型可从 @sker/llm-protocol 导入并被成功使用（编译期）', () => {
    // 这些赋值是编译期契约检查：若类型未导出或结构不符，check-types 将失败。
    const openaiReq: OpenAIRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hi' }],
      tools: [
        {
          type: 'function',
          function: { name: 'f', parameters: { type: 'object' } },
        },
      ],
    };
    const codexReq: CodexRequest = {
      model: 'codex',
      instructions: 'instr',
      input: [
        {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'hi' }],
        },
      ],
      tools: [],
      tool_choice: 'auto',
      parallel_tool_calls: true,
      stream: false,
      include: [],
    };
    const claudeReq: ClaudeRequest = {
      model: 'claude',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 100,
    };

    expect(openaiReq.model).toBe('gpt-4o');
    expect(codexReq.input.length).toBe(1);
    expect(claudeReq.max_tokens).toBe(100);
  });

  it('converter 输入输出类型与包导出类型一致', () => {
    const converter = new SourceConverter();
    const request: SourceOpenAIRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hi' }],
    };

    const result = converter.convert(request);

    expectTypeOf(result).toEqualTypeOf<SourceCodexRequest>();
    // 源码类型与包导出类型结构一致
    expectTypeOf<SourceOpenAIRequest>().toEqualTypeOf<OpenAIRequest>();
    expectTypeOf<SourceCodexRequest>().toEqualTypeOf<CodexRequest>();
  });

  it('以包导出类型实例化 converter 并调用 convert', () => {
    const converter: OpenAIToCodexConverter = new SourceConverter();
    const req: OpenAIRequest = {
      model: 'm',
      messages: [{ role: 'user', content: 'x' }],
    };

    const out: CodexRequest = converter.convert(req);

    expect(out.model).toBe('m');
    expect(Array.isArray(out.input)).toBe(true);
    expect(out.tool_choice).toBe('auto');
  });
});
