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

export class OpenAIToCodexConverter {
  convert(request: OpenAIRequest): CodexRequest {
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
      stream: request.stream ?? false,
      include: [],
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
      inputItems.push(messageInput);

      if (message.tool_calls && message.tool_calls.length > 0) {
        inputItems.push(...this.convertToolCalls(message.tool_calls));
      }
    }

    return {
      instructions: systemMessages.join('\n\n') || 'You are a helpful assistant.',
      inputItems,
    };
  }

  private convertMessage(message: OpenAIMessage): CodexMessageInput {
    return {
      type: 'message',
      role: message.role === 'user' ? 'user' : 'assistant',
      content: this.convertContent(message.content),
    };
  }

  private convertContent(
    content: string | OpenAIContentPart[] | null,
  ): CodexContent[] {
    if (!content) {
      return [{ type: 'input_text', text: '' }];
    }

    if (typeof content === 'string') {
      return [{ type: 'input_text', text: content }];
    }

    return content.map((part) => {
      if (part.type === 'text') {
        return { type: 'input_text' as const, text: part.text || '' };
      }

      if (part.type === 'image_url' && part.image_url) {
        return { type: 'input_image' as const, image_url: part.image_url.url };
      }

      return { type: 'input_text' as const, text: '' };
    });
  }

  private convertToolCalls(toolCalls: OpenAIToolCall[]): CodexFunctionCall[] {
    return toolCalls.map((call) => ({
      type: 'function_call',
      name: call.function.name,
      arguments: call.function.arguments,
      call_id: call.id,
    }));
  }

  private convertToolMessage(message: OpenAIMessage): CodexFunctionCallOutput {
    return {
      type: 'function_call_output',
      call_id: message.tool_call_id || '',
      output: this.extractTextContent(message.content),
    };
  }

  private convertTools(tools: OpenAITool[]): CodexFunctionTool[] {
    return tools.map((tool) => ({
      type: 'function',
      name: tool.function.name,
      description: tool.function.description || '',
      strict: false,
      parameters: this.convertParameters(tool.function.parameters),
    }));
  }

  private convertParameters(
    parameters?: Record<string, unknown>,
  ): CodexFunctionParameters {
    if (!parameters || typeof parameters !== 'object') {
      return {
        type: 'object',
        properties: {},
      };
    }

    const props = (parameters.properties as Record<string, any>) || {};
    const required = (parameters.required as string[]) || [];

    return {
      type: 'object',
      properties: this.convertProperties(props),
      required: required.length > 0 ? required : undefined,
      additionalProperties: parameters.additionalProperties as boolean | undefined,
    };
  }

  private convertProperties(
    props: Record<string, any>,
  ): Record<string, CodexParameterProperty> {
    const result: Record<string, CodexParameterProperty> = {};

    for (const [key, value] of Object.entries(props)) {
      result[key] = this.convertProperty(value);
    }

    return result;
  }

  private convertProperty(prop: any): CodexParameterProperty {
    const property: CodexParameterProperty = {
      type: prop.type || 'string',
    };

    if (prop.description) property.description = prop.description;
    if (prop.default !== undefined) property.default = prop.default;
    if (prop.enum) property.enum = prop.enum;
    if (prop.minimum !== undefined) property.minimum = prop.minimum;
    if (prop.maximum !== undefined) property.maximum = prop.maximum;
    if (prop.minLength !== undefined) property.minLength = prop.minLength;
    if (prop.format) property.format = prop.format;
    if (prop.title) property.title = prop.title;
    if (prop.exclusiveMinimum !== undefined) {
      property.exclusiveMinimum = prop.exclusiveMinimum;
    }
    if (prop.exclusiveMaximum !== undefined) {
      property.exclusiveMaximum = prop.exclusiveMaximum;
    }

    if (prop.items) {
      property.items = this.convertProperty(prop.items);
    }

    if (prop.properties) {
      property.properties = this.convertProperties(prop.properties);
      if (prop.required) {
        property.required = prop.required;
      }
      if (prop.additionalProperties !== undefined) {
        property.additionalProperties = prop.additionalProperties;
      }
    }

    return property;
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
