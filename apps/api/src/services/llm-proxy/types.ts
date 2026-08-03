export const TIMEOUT_MS = 1000 * 10 * 60; // 10 分钟超时
export const MAX_RETRIES = 3
export const RATE_LIMIT_COOLDOWN_MS = 60 * 1000 // 429 冷却时间：1 分钟

export interface ProviderInfo {
  providerId: string
  baseUrl?: string
  apiKey?: string
  modelName: string
  standardModelName?: string
  providerProtocol?: string
}

export interface ProxyResult {
  success: boolean
  response?: Response
  error?: string
}

export interface ProviderCandidate {
  provider_score: number
  provider_id: string
  mp_model_name?: string
  standard_model_name?: string
  provider_base_url?: string
  provider_api_key?: string
  provider_protocol?: string
}

export interface Usage {
  input_tokens?: number
  output_tokens?: number
}

export interface ChatLogParams {
  providerId: string
  modelName: string
  request: Record<string, unknown>
  durationMs: number
  isSuccess: boolean
  statusCode: number
  usage?: Usage
  error?: string
}
