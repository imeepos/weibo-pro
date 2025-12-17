import type {
  OpenAIRequest,
  OpenAIMessage,
  OpenAIContentPart,
  OpenAIResponse,
  OpenAIStreamResponse,
  ClaudeRequest,
  ClaudeMessage,
  ClaudeContentBlock,
  ClaudeResponse,
  ClaudeStreamEvent,
  ClaudeTool,
} from '../types';

const STOP_REASON_MAP: Record<string, ClaudeResponse['stop_reason']> = {
  stop: 'end_turn',
  length: 'max_tokens',
  tool_calls: 'tool_use',
};

function convertOpenAIContentToClaude(content: OpenAIMessage['content']): string | ClaudeContentBlock[] {
  if (content === null) return '';
  if (typeof content === 'string') return content;

  return content.map((part): ClaudeContentBlock => {
    if (part.type === 'text') {
      return { type: 'text', text: part.text ?? '' };
    }
    const url = part.image_url?.url ?? '';
    if (url.startsWith('data:')) {
      const [meta = '', data] = url.split(',');
      const mediaType = meta.match(/data:([^;]+)/)?.[1] ?? 'image/png';
      return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
    }
    return { type: 'image', source: { type: 'url', url } };
  });
}

function convertOpenAIToolsToClaude(tools: OpenAIRequest['tools']): ClaudeTool[] | undefined {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters ?? { type: 'object', properties: {} },
  }));
}

export function openaiRequestToClaude(req: OpenAIRequest): ClaudeRequest {
  const messages: ClaudeMessage[] = [];
  let system: string | undefined;

  for (const msg of req.messages) {
    if (msg.role === 'system') {
      system = typeof msg.content === 'string' ? msg.content : msg.content?.map((p) => (p as OpenAIContentPart).text).join('\n');
      continue;
    }

    if (msg.role === 'tool') {
      const last = messages[messages.length - 1];
      const toolResult: ClaudeContentBlock = {
        type: 'tool_result',
        tool_use_id: msg.tool_call_id!,
        content: typeof msg.content === 'string' ? msg.content : '',
      };
      if (last?.role === 'user' && Array.isArray(last.content)) {
        (last.content as ClaudeContentBlock[]).push(toolResult);
      } else {
        messages.push({ role: 'user', content: [toolResult] });
      }
      continue;
    }

    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    const content = convertOpenAIContentToClaude(msg.content);

    if (msg.tool_calls?.length) {
      const blocks: ClaudeContentBlock[] = typeof content === 'string' && content ? [{ type: 'text', text: content }] : (content as ClaudeContentBlock[]) || [];
      for (const tc of msg.tool_calls) {
        blocks.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments || '{}'),
        });
      }
      messages.push({ role, content: blocks });
    } else {
      messages.push({ role, content });
    }
  }

  return {
    model: req.model,
    messages,
    max_tokens: req.max_tokens ?? 4096,
    ...(system && { system }),
    ...(req.temperature !== undefined && { temperature: req.temperature }),
    ...(req.top_p !== undefined && { top_p: req.top_p }),
    ...(req.stream !== undefined && { stream: req.stream }),
    ...(req.stop && { stop_sequences: Array.isArray(req.stop) ? req.stop : [req.stop] }),
    ...(req.tools && { tools: convertOpenAIToolsToClaude(req.tools) }),
  };
}

export function claudeResponseToOpenai(res: ClaudeResponse): OpenAIResponse {
  let textContent = '';
  const toolCalls: OpenAIResponse['choices'][0]['message']['tool_calls'] = [];

  // 容错处理：如果 content 是字符串，直接使用；如果不是数组，包装为数组
  const contentBlocks = typeof res.content === 'string'
    ? [{ type: 'text' as const, text: res.content }]
    : Array.isArray(res.content)
      ? res.content
      : [];

  for (const block of contentBlocks) {
    if (block.type === 'text') textContent += block.text;
    if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        type: 'function',
        function: { name: block.name, arguments: JSON.stringify(block.input) },
      });
    }
  }

  const finishReason = res.stop_reason === 'end_turn' ? 'stop' : res.stop_reason === 'tool_use' ? 'tool_calls' : res.stop_reason === 'max_tokens' ? 'length' : 'stop';

  return {
    id: res.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: res.model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: textContent || null,
          ...(toolCalls.length && { tool_calls: toolCalls }),
        },
        finish_reason: finishReason,
      },
    ],
    usage: {
      prompt_tokens: res.usage.input_tokens,
      completion_tokens: res.usage.output_tokens,
      total_tokens: res.usage.input_tokens + res.usage.output_tokens,
    },
  };
}

interface StreamState {
  id: string;
  model: string;
  created: number;
  toolCallIndex: number;
  toolCallArgs: Map<number, string>;
}

export function createClaudeToOpenaiStreamConverter() {
  const state: StreamState = { id: '', model: '', created: 0, toolCallIndex: -1, toolCallArgs: new Map() };

  return (event: ClaudeStreamEvent): OpenAIStreamResponse | null => {
    if (event.type === 'ping') return null;

    if (event.type === 'message_start') {
      state.id = event.message.id;
      state.model = event.message.model;
      state.created = Math.floor(Date.now() / 1000);
      return {
        id: state.id,
        object: 'chat.completion.chunk',
        created: state.created,
        model: state.model,
        choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
      };
    }

    if (event.type === 'content_block_start') {
      if (event.content_block.type === 'tool_use') {
        state.toolCallIndex++;
        state.toolCallArgs.set(state.toolCallIndex, '');
        return {
          id: state.id,
          object: 'chat.completion.chunk',
          created: state.created,
          model: state.model,
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [{ id: event.content_block.id, type: 'function', function: { name: event.content_block.name, arguments: '' } }],
              },
              finish_reason: null,
            },
          ],
        };
      }
      return null;
    }

    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        return {
          id: state.id,
          object: 'chat.completion.chunk',
          created: state.created,
          model: state.model,
          choices: [{ index: 0, delta: { content: event.delta.text }, finish_reason: null }],
        };
      }
      if (event.delta.type === 'input_json_delta') {
        return {
          id: state.id,
          object: 'chat.completion.chunk',
          created: state.created,
          model: state.model,
          choices: [
            {
              index: 0,
              delta: { tool_calls: [{ index: state.toolCallIndex, function: { arguments: event.delta.partial_json } }] },
              finish_reason: null,
            },
          ],
        };
      }
    }

    if (event.type === 'message_delta') {
      const reason = event.delta.stop_reason;
      const finishReason = reason === 'end_turn' ? 'stop' : reason === 'tool_use' ? 'tool_calls' : reason === 'max_tokens' ? 'length' : null;
      return {
        id: state.id,
        object: 'chat.completion.chunk',
        created: state.created,
        model: state.model,
        choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
        usage: { prompt_tokens: 0, completion_tokens: event.usage.output_tokens, total_tokens: event.usage.output_tokens },
      };
    }

    return null;
  };
}
