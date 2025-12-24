/** Anthropic Claude Messages API Types */

export interface ClaudeTextContent {
  type: 'text';
  text: string;
}

export interface ClaudeImageContent {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    media_type?: string;
    data?: string;
    url?: string;
  };
}

export interface ClaudeToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ClaudeToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ClaudeContentBlock[];
}

export type ClaudeContentBlock =
  | ClaudeTextContent
  | ClaudeImageContent
  | ClaudeToolUseContent
  | ClaudeToolResultContent;

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

export interface ClaudeTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface ClaudeRequest {
  model: string;
  messages: ClaudeMessage[];
  system?: string | ClaudeTextContent[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  stop_sequences?: string[];
  tools?: ClaudeTool[];
  tool_choice?: { type: 'auto' | 'any' | 'tool'; name?: string };
}

export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ClaudeContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  usage: ClaudeUsage;
}

/** Claude SSE Stream Event Types */
export type ClaudeStreamEvent =
  | ClaudeMessageStartEvent
  | ClaudeContentBlockStartEvent
  | ClaudeContentBlockDeltaEvent
  | ClaudeContentBlockStopEvent
  | ClaudeMessageDeltaEvent
  | ClaudeMessageStopEvent
  | ClaudePingEvent;

export interface ClaudeMessageStartEvent {
  type: 'message_start';
  message: {
    id: string;
    type: 'message';
    role: 'assistant';
    model: string;
    content: [];
    usage: { input_tokens: number; output_tokens: number };
  };
}

export interface ClaudeContentBlockStartEvent {
  type: 'content_block_start';
  index: number;
  content_block: { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
}

export interface ClaudeContentBlockDeltaEvent {
  type: 'content_block_delta';
  index: number;
  delta: { type: 'text_delta'; text: string } | { type: 'input_json_delta'; partial_json: string };
}

export interface ClaudeContentBlockStopEvent {
  type: 'content_block_stop';
  index: number;
}

export interface ClaudeMessageDeltaEvent {
  type: 'message_delta';
  delta: { stop_reason: ClaudeResponse['stop_reason'] };
  usage: { output_tokens: number };
}

export interface ClaudeMessageStopEvent {
  type: 'message_stop';
}

export interface ClaudePingEvent {
  type: 'ping';
}
