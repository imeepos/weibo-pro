/**
 * 用户画像帖子抽取纯工具函数。
 * 不依赖数据库与业务实体，仅包含 JSON 解析、失败分类、
 * 超时控制、心跳与耗时格式化等可复用逻辑。
 */
import { postExtractionSchema, type PostExtraction } from './user-profile-post-extraction.schema';

export async function withTimeout<T>(
  run: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([run(), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export function normalizeJsonText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function parseExtractorJsonText(text: string): PostExtraction {
  const normalized = normalizeJsonText(text);
  return postExtractionSchema.parse(JSON.parse(normalized));
}

export function formatElapsedSeconds(elapsedMs: number): string {
  return `${Math.max(1, Math.round(elapsedMs / 1000))} 秒`;
}

export function isRetryableExtractionFailure(message: unknown): boolean {
  const normalized = String(message ?? '').toLowerCase();
  return [
    '超时',
    'timeout',
    'timed out',
    'fetch failed',
    'socket hang up',
    'econnreset',
    'econnrefused',
    'cannot read properties of undefined',
    '502',
    '503',
    '504',
    'bad gateway',
    'gateway timeout',
    'service unavailable',
  ].some((pattern) => normalized.includes(pattern));
}

export function isRecoverablePlainExtractorFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message || '';
  const stack = error.stack || '';

  return (
    error instanceof SyntaxError ||
    (error as { name?: string }).name === 'ZodError' ||
    /Cannot read properties of undefined \(reading 'message'\)/i.test(message) ||
    /Unexpected token .* is not valid JSON/i.test(message) ||
    /Invalid input:/i.test(message) ||
    stack.includes('@langchain/openai/dist/utils/output.js')
  );
}

export function startProgressHeartbeat(input: {
  heartbeatMs: number;
  onTick: (elapsedMs: number) => Promise<void>;
}): () => void {
  const startedAt = Date.now();
  const timer = setInterval(() => {
    void input.onTick(Date.now() - startedAt).catch((error) => {
      console.error('[UserProfilePostExtractionService] progress heartbeat failed:', error);
    });
  }, input.heartbeatMs);

  return () => clearInterval(timer);
}
