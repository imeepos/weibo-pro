import type {
  OpenAIRequest,
  OpenAIMessage,
  OpenAIContentPart,
  OpenAITool,
  OpenAIToolCall,
} from './types/openai';
import type {
  CodexRequest,
  CodexInputItem,
  CodexMessageInput,
  CodexContent,
  CodexFunctionTool,
  CodexFunctionCall,
  CodexFunctionCallOutput,
  CodexFunctionParameters,
  CodexParameterProperty,
} from './types/codex';
import { CODEX_PROMPT } from './tokens';
import { convertParameters } from './openai-to-codex-params';

// 简单的 ID 生成器（UUID v4）
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class OpenAIToCodexConverter {
  // 维护 OpenAI call_id 到 UUID 的映射，确保成对匹配
  private callIdMap: Map<string, string> = new Map();

  convert(request: OpenAIRequest): CodexRequest {
    // 每次转换前清空映射表
    this.callIdMap.clear();

    const { instructions, inputItems } = this.extractMessagesAndInstructions(
      request.messages,
    );

    return {
      model: request.model,
      instructions,
      input: inputItems,
      tools: this.convertTools(request.tools || []),
      tool_choice: this.convertToolChoice(request.tool_choice),
      parallel_tool_calls: true,
      reasoning: {
        effort: 'high',
        summary: 'auto'
      },
      store: false,
      stream: request.stream ?? true,
      include: ['reasoning.encrypted_content'],
      text: {
        verbosity: 'low'
      },
      prompt_cache_key: generateId()
    };
  }

  private extractMessagesAndInstructions(messages: OpenAIMessage[]): {
    instructions: string;
    inputItems: CodexInputItem[];
  } {
    const systemMessages: string[] = [];
    const inputItems: CodexInputItem[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        systemMessages.push(this.extractTextContent(message.content));
        continue;
      }

      if (message.role === 'tool') {
        inputItems.push(this.convertToolMessage(message));
        continue;
      }

      const messageInput = this.convertMessage(message);
      // 只添加非空消息
      if (messageInput) {
        inputItems.push(messageInput);
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        inputItems.push(...this.convertToolCalls(message.tool_calls));
      }
    }
    // 将 system prompt 作为第一条用户消息插入到 input 开头
    if (systemMessages) {
      inputItems.unshift({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: systemMessages.join('\n\n') || 'You are a helpful assistant.', }]
      });
    }
    return {
      instructions: CODEX_PROMPT,
      inputItems,
    };
  }

  private convertMessage(message: OpenAIMessage): CodexMessageInput | null {
    const content = this.convertContent(message.content);

    // 过滤空消息
    if (content.length === 0) {
      return null;
    }

    return {
      type: 'message',
      role: message.role === 'user' ? 'user' : 'assistant',
      content,
    };
  }

  private convertContent(
    content: string | OpenAIContentPart[] | null,
  ): CodexContent[] {
    if (!content) {
      return [];
    }

    if (typeof content === 'string') {
      return content.trim() ? [{ type: 'input_text', text: content }] : [];
    }

    const converted = content
      .map((part): CodexContent | null => {
        if (part.type === 'text') {
          const text = part.text || '';
          return text.trim() ? { type: 'input_text' as const, text } : null;
        }

        if (part.type === 'image_url' && part.image_url) {
          return { type: 'input_image' as const, image_url: part.image_url.url };
        }

        return null;
      })
      .filter((item): item is CodexContent => item !== null);

    return converted;
  }

  private convertToolCalls(toolCalls: OpenAIToolCall[]): CodexFunctionCall[] {
    return toolCalls.map((call) => {
      // 为每个 tool_call 生成 UUID，并存储映射关系
      let uuidCallId = this.callIdMap.get(call.id);
      if (!uuidCallId) {
        uuidCallId = generateId();
        this.callIdMap.set(call.id, uuidCallId);
      }

      return {
        type: 'function_call',
        name: call.function.name,
        arguments: call.function.arguments,
        call_id: uuidCallId,
      };
    });
  }

  private convertToolMessage(message: OpenAIMessage): CodexFunctionCallOutput {
    // 使用映射表获取对应的 UUID call_id
    const originalCallId = message.tool_call_id || '';
    let uuidCallId = this.callIdMap.get(originalCallId);

    // 如果映射表中没有，生成新的 UUID（容错处理）
    if (!uuidCallId) {
      uuidCallId = generateId();
      this.callIdMap.set(originalCallId, uuidCallId);
    }

    return {
      type: 'function_call_output',
      call_id: uuidCallId,
      output: this.extractTextContent(message.content),
    };
  }

  private convertTools(tools: OpenAITool[]): CodexFunctionTool[] {
    return tools.map((tool) => ({
      type: 'function',
      name: tool.function.name,
      description: tool.function.description || '',
      strict: false,
      parameters: convertParameters(tool.function.parameters),
    }));
  }

  private convertToolChoice(
    toolChoice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } },
  ): 'auto' | 'none' | string {
    if (!toolChoice || toolChoice === 'auto') {
      return 'auto';
    }

    if (toolChoice === 'none') {
      return 'none';
    }

    if (toolChoice === 'required') {
      return 'auto';
    }

    if (typeof toolChoice === 'object') {
      return toolChoice.function.name;
    }

    return 'auto';
  }

  private extractTextContent(content: string | OpenAIContentPart[] | null): string {
    if (!content) return '';
    if (typeof content === 'string') return content;

    return content
      .filter((part) => part.type === 'text')
      .map((part) => part.text || '')
      .join('\n');
  }
}
