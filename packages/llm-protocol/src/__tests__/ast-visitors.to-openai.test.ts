import { describe, it, expect } from 'vitest';
import {
  OpenAiRequestAst,
  ClaudeRequestAst,
  CodexRequestAst,
} from '../adaptors/ast/nodes';
import { ToOpenAiVisitor } from '../adaptors/ast/to-openai.visitor';
import type {
  OpenAIRequest,
  OpenAIMessage,
} from '../adaptors/types/openai';
import { codexRequest, claudeRequest, openAIRequest } from './ast-visitors.fixtures';

// ---------------------------------------------------------------------------
// ToOpenAiVisitor
// ---------------------------------------------------------------------------

describe('ToOpenAiVisitor', () => {
  it('CodexRequestAst -> OpenAIRequest 消息/function_call/function_call_output 转换', () => {
    const visitor = new ToOpenAiVisitor();
    const ast = new CodexRequestAst();
    ast.request = codexRequest;

    const result = visitor.visit(ast, {}) as OpenAIRequest;

    expect(result.model).toBe('codex-model');
    expect(result.stream).toBe(true);

    // instructions -> system 消息
    expect(result.messages[0]).toEqual({
      role: 'system',
      content: 'You are a test system',
    });
    // 用户消息
    expect(result.messages[1]).toEqual({
      role: 'user',
      content: 'Hello',
    });
    // assistant 消息 + 附加 tool_calls
    expect(result.messages[2]).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: 'Hi there' }],
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'get_weather', arguments: '{"city":"SF"}' },
        },
      ],
    });
    // function_call_output -> tool 消息
    expect(result.messages[3]).toEqual({
      role: 'tool',
      content: 'sunny',
      tool_call_id: 'call_1',
    });

    // 工具转换
    expect(result.tools).toEqual([
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'weather',
          parameters: {
            type: 'object',
            properties: { city: { type: 'string' } },
          },
        },
      },
    ]);
  });

  it('ClaudeRequestAst -> OpenAIRequest 系统/文本/工具调用转换', () => {
    const visitor = new ToOpenAiVisitor();
    const ast = new ClaudeRequestAst();
    ast.request = claudeRequest;

    const result = visitor.visit(ast, {}) as OpenAIRequest;

    expect(result.model).toBe('claude-3-5');
    expect(result.max_tokens).toBe(100);
    expect(result.messages[0]).toEqual({
      role: 'system',
      content: 'System prompt',
    });
    expect(result.messages[1]).toEqual({ role: 'user', content: 'Hello' });

    // assistant：文本 + tool_use -> assistant with tool_calls
    const assistantMsg = result.messages[2] as OpenAIMessage;
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.content).toBe('Let me check');
    expect(assistantMsg.tool_calls).toEqual([
      {
        id: 'toolu_1',
        type: 'function',
        function: { name: 'get_weather', arguments: '{"city":"SF"}' },
      },
    ]);

    // tool_result -> tool 消息
    expect(result.messages[3]).toEqual({
      role: 'tool',
      tool_call_id: 'toolu_1',
      content: 'sunny',
    });
  });

  it('OpenAiRequestAst 透传', () => {
    const visitor = new ToOpenAiVisitor();
    const ast = new OpenAiRequestAst();
    ast.request = openAIRequest;

    const result = visitor.visit(ast, {});

    expect(result).toBe(openAIRequest);
  });
});
