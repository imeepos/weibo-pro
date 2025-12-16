import type {
  OpenAIRequest,
  OpenAIMessage,
  OpenAIResponse,
  OpenAIStreamResponse,
  OpenAITool,
  ClaudeRequest,
  ClaudeMessage,
  ClaudeContentBlock,
  ClaudeResponse,
  ClaudeStreamEvent,
} from '../types';

function convertClaudeContentToOpenAI(content: ClaudeMessage['content']): OpenAIMessage['content'] {
  if (typeof content === 'string') return content;
  const texts = content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text);
  return texts.join('') || null;
}

function convertClaudeToolsToOpenAI(tools: ClaudeRequest['tools']): OpenAITool[] | undefined {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

export function claudeRequestToOpenai(req: ClaudeRequest): OpenAIRequest {
  const messages: OpenAIMessage[] = [];

  if (req.system) {
    const systemText = typeof req.system === 'string' ? req.system : req.system.map((s) => s.text).join('\n');
    messages.push({ role: 'system', content: systemText });
  }

  for (const msg of req.messages) {
    if (typeof msg.content === 'string') {
      messages.push({ role: msg.role, content: msg.content });
      continue;
    }

    const toolResults = msg.content.filter((b) => b.type === 'tool_result');
    const toolUses = msg.content.filter((b) => b.type === 'tool_use');
    const others = msg.content.filter((b) => b.type !== 'tool_result' && b.type !== 'tool_use');

    for (const tr of toolResults) {
      if (tr.type === 'tool_result') {
        messages.push({
          role: 'tool',
          tool_call_id: tr.tool_use_id,
          content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content),
        });
      }
    }

    if (toolUses.length) {
      const textContent = others.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
      messages.push({
        role: 'assistant',
        content: textContent || null,
        tool_calls: toolUses.map((tu) => {
          if (tu.type !== 'tool_use') throw new Error('Invalid tool_use');
          return {
            id: tu.id,
            type: 'function' as const,
            function: { name: tu.name, arguments: JSON.stringify(tu.input) },
          };
        }),
      });
    } else if (others.length) {
      messages.push({ role: msg.role, content: convertClaudeContentToOpenAI(others) });
    }
  }

  return {
    model: req.model,
    messages,
    max_tokens: req.max_tokens,
    ...(req.temperature !== undefined && { temperature: req.temperature }),
    ...(req.top_p !== undefined && { top_p: req.top_p }),
    ...(req.stream !== undefined && { stream: req.stream }),
    ...(req.stop_sequences?.length && { stop: req.stop_sequences }),
    ...(req.tools && { tools: convertClaudeToolsToOpenAI(req.tools) }),
  };
}

export function openaiResponseToClaude(res: OpenAIResponse): ClaudeResponse {
  const content: ClaudeContentBlock[] = [];
  let stopReason: ClaudeResponse['stop_reason'] = 'end_turn';

  for (const choice of res.choices) {
    if (choice.message.content) {
      content.push({ type: 'text', text: choice.message.content as string });
    }
    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments || '{}'),
        });
      }
      stopReason = 'tool_use';
    }
    if (choice.finish_reason === 'length') stopReason = 'max_tokens';
    if (choice.finish_reason === 'stop') stopReason = 'end_turn';
  }

  return {
    id: res.id,
    type: 'message',
    role: 'assistant',
    content,
    model: res.model,
    stop_reason: stopReason,
    usage: {
      input_tokens: res.usage.prompt_tokens,
      output_tokens: res.usage.completion_tokens,
    },
  };
}

interface StreamState {
  id: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  contentIndex: number;
  currentToolId: string;
  currentToolName: string;
  toolArgs: string;
  sentStart: boolean;
  sentContentStart: boolean;
}

export function createOpenaiToClaudeStreamConverter() {
  const state: StreamState = {
    id: '',
    model: '',
    inputTokens: 0,
    outputTokens: 0,
    contentIndex: 0,
    currentToolId: '',
    currentToolName: '',
    toolArgs: '',
    sentStart: false,
    sentContentStart: false,
  };

  return (chunk: OpenAIStreamResponse): ClaudeStreamEvent[] => {
    const events: ClaudeStreamEvent[] = [];

    if (!state.sentStart) {
      state.id = chunk.id;
      state.model = chunk.model;
      state.sentStart = true;
      events.push({
        type: 'message_start',
        message: {
          id: state.id,
          type: 'message',
          role: 'assistant',
          model: state.model,
          content: [],
          usage: { input_tokens: 0, output_tokens: 0 },
        },
      });
    }

    for (const choice of chunk.choices) {
      const delta = choice.delta;

      if (delta.content) {
        if (!state.sentContentStart) {
          state.sentContentStart = true;
          events.push({
            type: 'content_block_start',
            index: state.contentIndex,
            content_block: { type: 'text', text: '' },
          });
        }
        events.push({
          type: 'content_block_delta',
          index: state.contentIndex,
          delta: { type: 'text_delta', text: delta.content },
        });
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.id && tc.function?.name) {
            if (state.sentContentStart) {
              events.push({ type: 'content_block_stop', index: state.contentIndex });
              state.contentIndex++;
              state.sentContentStart = false;
            }
            state.currentToolId = tc.id;
            state.currentToolName = tc.function.name;
            state.toolArgs = '';
            events.push({
              type: 'content_block_start',
              index: state.contentIndex,
              content_block: { type: 'tool_use', id: tc.id, name: tc.function.name, input: {} },
            });
          }
          if (tc.function?.arguments) {
            state.toolArgs += tc.function.arguments;
            events.push({
              type: 'content_block_delta',
              index: state.contentIndex,
              delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
            });
          }
        }
      }

      if (choice.finish_reason) {
        events.push({ type: 'content_block_stop', index: state.contentIndex });
        const stopReason = choice.finish_reason === 'tool_calls' ? 'tool_use' : choice.finish_reason === 'length' ? 'max_tokens' : 'end_turn';
        events.push({
          type: 'message_delta',
          delta: { stop_reason: stopReason },
          usage: { output_tokens: chunk.usage?.completion_tokens ?? 0 },
        });
        events.push({ type: 'message_stop' });
      }
    }

    return events;
  };
}
