import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai'

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

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
      baseURL: OPENAI_BASE_URL,
      apiKey: OPENAI_API_KEY
    },
    maxTokens: 16384
  }

  console.log(`[LLM Client] 创建模型: ${modelName}, baseURL: ${OPENAI_BASE_URL}, maxTokens: ${config.maxTokens}`)

  return new ChatOpenAI(config)
}
