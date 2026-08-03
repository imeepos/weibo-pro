/**
 * 用户画像帖子抽取的默认参数与环境变量解析。
 * 所有可调参数集中于此，便于统一管理与测试。
 */

export const DEFAULT_EXTRACTOR_VERSION = 'post-v1';
export const DEFAULT_EXTRACTOR_MODEL = 'deepseek-ai/DeepSeek-V3.2';
export const DEFAULT_EXTRACTOR_TIMEOUT_MS = 30_000;
export const DEFAULT_EXTRACTOR_RETRY_LIMIT = 1;
export const DEFAULT_EXTRACTOR_PROGRESS_HEARTBEAT_MS = 10_000;

export function resolveExtractorTimeoutMs(): number {
  const timeoutMs = Number(process.env.USER_PROFILE_POST_EXTRACTION_TIMEOUT_MS);
  return Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : DEFAULT_EXTRACTOR_TIMEOUT_MS;
}

export function resolveExtractorRetryLimit(): number {
  const retryLimit = Number(process.env.USER_PROFILE_POST_EXTRACTION_RETRY_LIMIT);
  return Number.isInteger(retryLimit) && retryLimit >= 0
    ? retryLimit
    : DEFAULT_EXTRACTOR_RETRY_LIMIT;
}

export function resolveExtractorProgressHeartbeatMs(): number {
  const heartbeatMs = Number(process.env.USER_PROFILE_POST_EXTRACTION_PROGRESS_HEARTBEAT_MS);
  return Number.isFinite(heartbeatMs) && heartbeatMs > 0
    ? heartbeatMs
    : DEFAULT_EXTRACTOR_PROGRESS_HEARTBEAT_MS;
}
