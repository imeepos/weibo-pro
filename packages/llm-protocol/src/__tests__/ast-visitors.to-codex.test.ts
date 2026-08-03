import { describe, it, expect } from 'vitest';
import {
  OpenAiRequestAst,
  ClaudeRequestAst,
  CodexRequestAst,
} from '../adaptors/ast/nodes';
import { ToCodexVisitor } from '../adaptors/ast/to-codex.visitor';
import { CODEX_PROMPT } from '../adaptors/tokens';
import type {
  CodexRequest,
  CodexFunctionCall,
  CodexFunctionCallOutput,
  CodexFunctionTool,
} from '../adaptors/types/codex';
import { codexRequest, claudeRequest } from './ast-visitors.fixtures';

// ---------------------------------------------------------------------------
// ToCodexVisitor
// ---------------------------------------------------------------------------

describe('ToCodexVisitor', () => {
  it('OpenAiRequestAst -> CodexRequest 基础转换', () => {
    const visitor = new ToCodexVisitor();
    const ast = new OpenAiRequestAst();
    ast.request = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    };

    const result = visitor.visit(ast, {}) as CodexRequest;

    expect(result.model).toBe('gpt-4o');
    expect(result.instructions).toBe(CODEX_PROMPT);
    expect(result.stream).toBe(false);
    expect(result.parallel_tool_calls).toBe(true);
    expect(result.tool_choice).toBe('auto');
    expect(result.input.length).toBeGreaterThan(0);
  });

  it('ClaudeRequestAst -> CodexRequest 消息与工具调用转换', () => {
    const visitor = new ToCodexVisitor();
    const ast = new ClaudeRequestAst();
    ast.request = claudeRequest;

    const result = visitor.visit(ast, {}) as CodexRequest;

    expect(result.model).toBe('claude-3-5');
    expect(result.instructions).toBe(CODEX_PROMPT);
    expect(result.tool_choice).toBe('auto');
    expect(result.stream).toBe(false);

    // system 前导 user 消息
    expect(result.input[0]).toEqual({
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: 'System prompt' }],
    });

    // 用户消息
    expect(result.input[1]).toEqual({
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: 'Hello' }],
    });

    // assistant 文本消息（tool_use 被拆出为 function_call）
    expect(result.input[2]).toEqual({
      type: 'message',
      role: 'assistant',
      content: [{ type: 'input_text', text: 'Let me check' }],
    });

    const functionCall = result.input[3] as CodexFunctionCall | undefined;
    expect(functionCall).toBeDefined();
    expect(functionCall!.type).toBe('function_call');
    expect(functionCall!.name).toBe('get_weather');
    expect(functionCall!.arguments).toBe('{"city":"SF"}');
    expect(functionCall!.call_id).toBe('toolu_1');

    // tool_result 消息：空 content 的 user 消息 + function_call_output
    expect(result.input[4]).toEqual({
      type: 'message',
      role: 'user',
      content: [],
    });

    const functionCallOutput = result.input[5] as CodexFunctionCallOutput | undefined;
    expect(functionCallOutput).toBeDefined();
    expect(functionCallOutput!.type).toBe('function_call_output');
    expect(functionCallOutput!.call_id).toBe('toolu_1');
    expect(functionCallOutput!.output).toBe('sunny');
  });

  it('ClaudeRequestAst -> CodexRequest 工具定义转换', () => {
    const visitor = new ToCodexVisitor();
    const ast = new ClaudeRequestAst();
    ast.request = claudeRequest;

    const result = visitor.visit(ast, {}) as CodexRequest;

    const tool = result.tools[0] as CodexFunctionTool | undefined;
    expect(tool).toBeDefined();
    expect(tool!.type).toBe('function');
    expect(tool!.name).toBe('get_weather');
    expect(tool!.description).toBe('weather');
    expect(tool!.strict).toBe(false);
    expect(tool!.parameters.type).toBe('object');
    expect(tool!.parameters.properties).toEqual({ city: { type: 'string' } });
    expect(tool!.parameters.required).toEqual(['city']);
  });

  it('CodexRequestAst 透传', () => {
    const visitor = new ToCodexVisitor();
    const ast = new CodexRequestAst();
    ast.request = codexRequest;

    const result = visitor.visit(ast, {});

    expect(result).toBe(codexRequest);
  });
});
