import { describe, it, expect } from 'vitest';
import {
  OpenAiRequestAst,
  ClaudeRequestAst,
  CodexRequestAst,
} from '../adaptors/ast/nodes';
import { ToAnthropicVisitor } from '../adaptors/ast/to-anthropic.visitor';
import type {
  ClaudeRequest,
  ClaudeMessage,
} from '../adaptors/types/claude';
import { openAIRequest, codexRequest, claudeRequest } from './ast-visitors.fixtures';

// ---------------------------------------------------------------------------
// ToAnthropicVisitor
// ---------------------------------------------------------------------------

describe('ToAnthropicVisitor', () => {
  it('OpenAiRequestAst -> ClaudeRequest 系统/消息/tool_calls 转换', () => {
    const visitor = new ToAnthropicVisitor();
    const ast = new OpenAiRequestAst();
    ast.request = openAIRequest;

    const result = visitor.visit(ast, {}) as ClaudeRequest;

    expect(result.model).toBe('gpt-4o');
    expect(result.system).toBe('You are helpful');
    expect(result.max_tokens).toBe(4096);
    expect(result.messages[0]).toEqual({ role: 'user', content: 'Hi' });

    // assistant tool_calls -> tool_use 内容块
    const assistantMsg = result.messages[1] as ClaudeMessage;
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.content).toEqual([
      {
        type: 'tool_use',
        id: 'call_1',
        name: 'get_weather',
        input: { city: 'SF' },
      },
    ]);

    // tool 消息 -> tool_result 内容块
    expect(result.messages[2]).toEqual({
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'call_1', content: 'sunny' },
      ],
    });

    // tools 转换
    const tool = result.tools?.[0];
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('get_weather');
    expect(tool!.description).toBe('weather');
    expect(tool!.input_schema).toEqual({
      type: 'object',
      properties: { city: { type: 'string' } },
    });
  });

  it('CodexRequestAst -> ClaudeRequest 消息/function_call/输出转换', () => {
    const visitor = new ToAnthropicVisitor();
    const ast = new CodexRequestAst();
    ast.request = codexRequest;

    const result = visitor.visit(ast, {}) as ClaudeRequest;

    expect(result.model).toBe('codex-model');
    expect(result.system).toBe('You are a test system');
    expect(result.max_tokens).toBe(4096);
    expect(result.stream).toBe(true);

    expect(result.messages[0]).toEqual({ role: 'user', content: 'Hello' });

    // assistant 文本 + function_call -> tool_use
    const assistantMsg = result.messages[1] as ClaudeMessage;
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.content).toEqual([
      { type: 'text', text: 'Hi there' },
      {
        type: 'tool_use',
        id: 'call_1',
        name: 'get_weather',
        input: { city: 'SF' },
      },
    ]);

    // function_call_output -> tool_result
    expect(result.messages[2]).toEqual({
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'call_1', content: 'sunny' },
      ],
    });

    // tools 转换
    const tool = result.tools?.[0];
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('get_weather');
    expect(tool!.input_schema).toEqual({
      type: 'object',
      properties: { city: { type: 'string' } },
    });
  });

  it('ClaudeRequestAst 透传', () => {
    const visitor = new ToAnthropicVisitor();
    const ast = new ClaudeRequestAst();
    ast.request = claudeRequest;

    const result = visitor.visit(ast, {});

    expect(result).toBe(claudeRequest);
  });
});
