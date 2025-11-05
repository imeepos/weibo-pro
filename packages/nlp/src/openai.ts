import OpenAI, { ClientOptions } from 'openai';
export function useOpenAi() {
  return new OpenAI(getOpenAiConfig())
}
export function getOpenAiConfig(): ClientOptions {
  return {
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
  }
}