import { describe, it, expect } from 'vitest';
import {
  OpenAiRequestAst,
  ClaudeRequestAst,
  CodexRequestAst,
} from '../adaptors/ast/nodes';
import { ToCodexVisitor } from '../adaptors/ast/to-codex.visitor';
import { ToOpenAiVisitor } from '../adaptors/ast/to-openai.visitor';
import { ToAnthropicVisitor } from '../adaptors/ast/to-anthropic.visitor';
import { CODEX_PROMPT } from '../adaptors/tokens';
import type {
  CodexRequest,
  CodexFunctionCall,
  CodexFunctionCallOutput,
  CodexFunctionTool,
} from '../adaptors/types/codex';
import type {
  OpenAIRequest,
  OpenAIMessage,
} from '../adaptors/types/openai';
import type {
  ClaudeRequest,
  ClaudeMessage,
} from '../adaptors/types/claude';

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

const codexRequest: CodexRequest = {
  model: 'codex-model',
  instructions: 'You are a test system',
  input: [
    {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: 'Hello' }],
    },
    {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: 'Hi there' }],
    },
    {
      type: 'function_call',
      name: 'get_weather',
      arguments: '{"city":"SF"}',
      call_id: 'call_1',
    },
    {
      type: 'function_call_output',
      call_id: 'call_1',
      output: 'sunny',
    },
  ],
  tools: [
    {
      type: 'function',
      name: 'get_weather',
      description: 'weather',
      strict: false,
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
      },
    },
  ],
  tool_choice: 'auto',
  parallel_tool_calls: true,
  stream: true,
  include: [],
};

const openAIRequest: OpenAIRequest = {
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are helpful' },
    { role: 'user', content: 'Hi' },
    {
      role: 'assistant',
      content: null,
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
  tools: [
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
  ],
};

const claudeRequest: ClaudeRequest = {
  model: 'claude-3-5',
  max_tokens: 100,
  system: 'System prompt',
  messages: [
    { role: 'user', content: 'Hello' },
    {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me check' },
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'get_weather',
          input: { city: 'SF' },
        },
      ],
    },
    {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'sunny' }],
    },
  ],
  tools: [
    {
      name: 'get_weather',
      description: 'weather',
      input_schema: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
    },
  ],
};

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
