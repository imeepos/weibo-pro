import OpenAI, { ClientOptions } from 'openai';

/**
 * LLM 代理服务地址
 * 使用本地代理统一处理 LLM 调用
 */
const LLM_PROXY_BASE_URL = process.env.API_BASE_URL
  ? `${process.env.API_BASE_URL}/api/auth/llm/openai`
  : 'http://localhost:8089/api/auth/llm/openai';

export { OpenAI }

export async function useOpenAi(): Promise<OpenAI> {
  const config = await getOpenAiConfig();
  return new OpenAI({
    ...config,
  });
}

export async function getOpenAiConfig(): Promise<ClientOptions> {
  // openai 7 移除了 httpAgent 选项；LLM 走本地代理服务（HTTP），无需 https agent
  return {
    baseURL: LLM_PROXY_BASE_URL,
    apiKey: 'xxx',
    timeout: 60000,
    maxRetries: 2, // 降低重试次数，由上层 NLPAnalyzer 控制重试逻辑
  };
}