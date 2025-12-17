import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai'

const LLM_PROXY_BASE_URL = process.env.LLM_PROXY_BASE_URL || 'http://localhost:8089/llm/openai'

export interface LlmModelOptions {
  model?: string
  temperature?: number
}

export function useLlmModel(options: LlmModelOptions = {}): ChatOpenAI<ChatOpenAICallOptions> {
  const modelName = options.model || 'deepseek-ai/DeepSeek-V3.2'
  const config = {
    model: modelName,
    temperature: options.temperature ?? 0.7,
    configuration: {
      baseURL: LLM_PROXY_BASE_URL
    },
    maxTokens: 16384,
  }

  return new ChatOpenAI(config)
}
