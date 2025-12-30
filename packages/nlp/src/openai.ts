import OpenAI, { ClientOptions } from 'openai';

/**
 * LLM 代理服务地址
 * 使用本地代理统一处理 LLM 调用
 */
const LLM_PROXY_BASE_URL = process.env.LLM_PROXY_BASE_URL || 'http://localhost:8089/llm/openai';

export { OpenAI }

export function useOpenAi(): OpenAI {
  const config = getOpenAiConfig();
  return new OpenAI(config);
}

export function getOpenAiConfig(): ClientOptions {
  return {
    baseURL: LLM_PROXY_BASE_URL,
    apiKey: 'xxx',
  };
}