import type { CodexRequest } from '../adaptors/types/codex';
import type { OpenAIRequest } from '../adaptors/types/openai';
import type { ClaudeRequest } from '../adaptors/types/claude';

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

export const codexRequest: CodexRequest = {
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

export const openAIRequest: OpenAIRequest = {
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

export const claudeRequest: ClaudeRequest = {
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
