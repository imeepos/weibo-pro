import { describe, it, expect } from 'vitest';
import {
  OpenAiRequestAst,
  CodexRequestAst,
} from '../adaptors/ast/nodes';
import { ToCodexVisitor } from '../adaptors/ast/to-codex.visitor';
import { ToOpenAiVisitor } from '../adaptors/ast/to-openai.visitor';
import type {
  CodexRequest,
  CodexFunctionCall,
  CodexFunctionCallOutput,
} from '../adaptors/types/codex';
import type { OpenAIRequest } from '../adaptors/types/openai';

// ---------------------------------------------------------------------------
// 往返转换（OpenAI -> Codex -> OpenAI）
// ---------------------------------------------------------------------------

describe('往返转换', () => {
  it('带文本与 tool_calls 的 assistant 消息往返后保留工具调用', () => {
    const toCodex = new ToCodexVisitor();
    const toOpenAI = new ToOpenAiVisitor();

    const request: OpenAIRequest = {
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: 'weather?' },
        {
          role: 'assistant',
          content: 'checking',
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'get_weather', arguments: '{"city":"SF"}' },
            },
          ],
        },
        { role: 'tool', tool_call_id: 'call_1', content: 'sunny' },
      ],
    };

    const openaiAst = new OpenAiRequestAst();
    openaiAst.request = request;
    const codexResult = toCodex.visit(openaiAst, {}) as CodexRequest;

    // 找到 assistant 消息及其后的 function_call
    const assistantIdx = codexResult.input.findIndex(
      (item) => item.type === 'message' && item.role === 'assistant',
    );
    expect(assistantIdx).toBeGreaterThan(-1);
    const call = codexResult.input
      .slice(assistantIdx)
      .find((item) => item.type === 'function_call') as
      | CodexFunctionCall
      | undefined;
    const output = codexResult.input.find(
      (item) => item.type === 'function_call_output',
    ) as CodexFunctionCallOutput | undefined;
    expect(call).toBeDefined();
    expect(output).toBeDefined();
    expect(output!.call_id).toBe(call!.call_id);

    // Codex -> OpenAI 还原
    const codexAst = new CodexRequestAst();
    codexAst.request = codexResult;
    const restored = toOpenAI.visit(codexAst, {}) as OpenAIRequest;

    const restoredAssistant = restored.messages.find(
      (m) => m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0,
    );
    expect(restoredAssistant).toBeDefined();
    expect(restoredAssistant!.tool_calls).toHaveLength(1);
    expect(restoredAssistant!.tool_calls![0]!.function.name).toBe(
      'get_weather',
    );

    const restoredTool = restored.messages.find(
      (m) => m.role === 'tool',
    );
    expect(restoredTool).toBeDefined();
    expect(restoredTool!.tool_call_id).toBe(
      restoredAssistant!.tool_calls![0]!.id,
    );
  });
});
