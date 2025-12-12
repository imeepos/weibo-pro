import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai'

const LLM_PROXY_BASE_URL = process.env.LLM_PROXY_BASE_URL || 'http://localhost:8089/llm/openai'

export interface LlmModelOptions {
  model?: string
  temperature?: number
}

export function useLlmModel(options: LlmModelOptions = {}): ChatOpenAI<ChatOpenAICallOptions> {
  return new ChatOpenAI({
    model: options.model || 'gpt-4o-mini',
    temperature: options.temperature ?? 0.7,
    configuration: { baseURL: LLM_PROXY_BASE_URL },
  })
}
