/**
 * 流式 LLM 调用器共享类型
 *
 * 从 StreamingLlmInvoker.ts 抽取的类型定义。
 */
import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';
import { Runnable } from '@langchain/core/runnables';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessageChunk } from '@langchain/core/messages';
import { StructuredToolInterface } from '@langchain/core/tools';

/** 兼容的模型类型：ChatOpenAI 或通用 Runnable */
export type ChatModel =
  | ChatOpenAI<ChatOpenAICallOptions>
  | Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>;

export interface MessageContent {
  role: string;
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LlmResponse {
  content: string;
  tool_calls?: ToolCall[];
  [key: string]: unknown;
}

export interface ToolMessage {
  role: 'tool';
  content: string;
  tool_call_id: string;
  name: string;
}

export interface RoundState {
  messages: Array<MessageContent | LlmResponse | ToolMessage>;
  round: number;
  isDone: boolean;
}

export interface StreamChunk {
  type: 'delta' | 'complete' | 'tool_call' | 'tool_progress' | 'tool_result'
  delta?: string
  fullText?: string
  toolCalls?: ToolCall[]
  toolProgress?: {
    round: number
    totalRounds?: number
    currentTool: string
    status: 'executing' | 'completed'
    message: string
  }
  toolResult?: {
    toolName: string
    resultSummary: string
    resultLength: number
  }
}

/** 工具调用类型（供 handleToolCalls 使用） */
export type ToolDefinition = StructuredToolInterface;
