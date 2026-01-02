import OpenAI, { ClientOptions } from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { useProxy } from '@sker/ip-proxy';

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
  let httpAgent;

  try {
    const proxy = useProxy();
    const proxyInfo = await proxy.getProxy();
    httpAgent = new HttpsProxyAgent(proxyInfo.url);
  } catch (error) {
    // 代理获取失败，使用无代理模式
    httpAgent = undefined;
  }

  return {
    baseURL: LLM_PROXY_BASE_URL,
    apiKey: 'xxx',
    timeout: 60000,
    maxRetries: 3,
    httpAgent,
  };
}