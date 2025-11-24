import OpenAI, { ClientOptions } from 'openai';

export { OpenAI }
export function useOpenAi() {
  const config = getOpenAiConfig();
  validateOpenAiConfig(config);
  return new OpenAI(config);
}

export function getOpenAiConfig(): ClientOptions {
  return {
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
  };
}

function validateOpenAiConfig(config: ClientOptions): void {
  if (!config.apiKey) {
    throw new Error(
      'OPENAI_API_KEY 环境变量未设置。请检查 .env 文件或环境变量配置。'
    );
  }

  if (!config.baseURL) {
    throw new Error(
      'OPENAI_BASE_URL 环境变量未设置。请检查 .env 文件或环境变量配置。'
    );
  }

  console.log('OpenAI 配置验证通过:', {
    baseURL: config.baseURL,
    apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : '未设置'
  });
}