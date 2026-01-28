import OpenAI from 'openai';
import type { ChatMessage, OpenAIConfig, FinishReason } from '../types/openai.types.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DEFAULT_CONFIG: OpenAIConfig = {
  maxRetries: 10,
  retryDelay: 1000,
};

/**
 * 同步调用OpenAI Chat Completions API
 * @param model - 模型名称
 * @param prompt - 提示词
 * @param apiKey - API密钥(可选,默认从环境变量读取)
 * @param chatHistory - 对话历史(可选)
 * @returns API响应内容
 */
export async function ChatGPT_API(
  model: string,
  prompt: string,
  apiKey?: string,
  chatHistory?: ChatMessage[]
): Promise<string> {
  const config = { ...DEFAULT_CONFIG };

  const openai = new OpenAI({
    apiKey: apiKey || process.env.CHATGPT_API_KEY || '',
  });

  const messages: ChatMessage[] = chatHistory ? [...chatHistory] : [];
  messages.push({ role: 'user', content: prompt });

  for (let i = 0; i < config.maxRetries!; i++) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: messages as never, // OpenAI SDK 类型定义不匹配
        temperature: 0,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: unknown) {
      const err = error as Error;
      if (i < config.maxRetries! - 1) {
        await new Promise(resolve => setTimeout(resolve, config.retryDelay!));
      } else {
        console.error('Max retries reached for ChatGPT API:', err.message);
        throw error;
      }
    }
  }

  return '';
}

/**
 * 异步调用OpenAI API(用于并发处理)
 * @param model - 模型名称
 * @param prompt - 提示词
 * @param apiKey - API密钥(可选)
 * @returns API响应内容
 */
export async function ChatGPT_API_async(
  model: string,
  prompt: string,
  apiKey?: string
): Promise<string> {
  return ChatGPT_API(model, prompt, apiKey);
}

/**
 * 带完成原因的API调用
 * @param model - 模型名称
 * @param prompt - 提示词
 * @param apiKey - API密钥(可选)
 * @param chatHistory - 对话历史(可选)
 * @returns [content, finishReason]
 */
export async function ChatGPT_API_with_finish_reason(
  model: string,
  prompt: string,
  apiKey?: string,
  chatHistory?: ChatMessage[]
): Promise<[content: string, finishReason: FinishReason]> {
  const config = { ...DEFAULT_CONFIG };
  const openai = new OpenAI({
    apiKey: apiKey || process.env.CHATGPT_API_KEY || '',
  });

  const messages: ChatMessage[] = chatHistory ? [...chatHistory] : [];
  messages.push({ role: 'user', content: prompt });

  for (let i = 0; i < config.maxRetries!; i++) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: messages as never, // OpenAI SDK 类型定义不匹配
        temperature: 0,
      });

      const content = response.choices[0]?.message?.content || '';
      const finishReason = response.choices[0]?.finish_reason === 'stop'
        ? 'finished' as const
        : 'max_output_reached' as const;

      return [content, finishReason];
    } catch (error: unknown) {
      if (i < config.maxRetries! - 1) {
        await new Promise(resolve => setTimeout(resolve, config.retryDelay!));
      } else {
        throw error;
      }
    }
  }

  return ['', 'finished'];
}
