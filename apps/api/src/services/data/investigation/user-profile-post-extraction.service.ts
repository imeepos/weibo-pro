import { Injectable } from '@sker/core';
import {
  UserProfilePostExtractionEntity,
  useEntityManager,
} from '@sker/entities';
import { useLlmModel } from '@sker/workflow-run';
import {
  postExtractionSchema,
  type PostExtraction,
} from './user-profile-post-extraction.schema';

const DEFAULT_EXTRACTOR_VERSION = 'post-v1';
const DEFAULT_EXTRACTOR_MODEL = 'deepseek-ai/DeepSeek-V3.2';
const DEFAULT_EXTRACTOR_TIMEOUT_MS = 30_000;
const DEFAULT_EXTRACTOR_RETRY_LIMIT = 1;
const DEFAULT_EXTRACTOR_PROGRESS_HEARTBEAT_MS = 10_000;

type ExtractionRepo = {
  findOne: (input: unknown) => Promise<any>;
  create: (input: Record<string, unknown>) => any;
  save: (input: Record<string, unknown>) => Promise<any>;
};

@Injectable({ providedIn: 'root' })
export class UserProfilePostExtractionService {
  private extractionRepo?: ExtractionRepo;

  async resolveExtraction(input: {
    sourcePostId: string;
    weiboUserId: string;
    extractorVersion?: string;
    fingerprint: string;
    normalizedText: string;
    sourceSnapshot: Record<string, unknown>;
    taskId?: string | null;
  }): Promise<{ reused: boolean; record: any }> {
    return this.withRepo(async (repo) => {
      const extractorVersion = input.extractorVersion ?? DEFAULT_EXTRACTOR_VERSION;
      const existing = await repo.findOne({
        where: {
          source_post_id: input.sourcePostId,
          extractor_version: extractorVersion,
        },
      });

      if (
        existing?.status === 'succeeded' &&
        existing?.extractor_version === extractorVersion &&
        existing?.extracted_json?.contentFingerprint === input.fingerprint
      ) {
        return { reused: true, record: existing };
      }

      try {
        const extracted = await this.invokeExtractor({
          normalizedText: input.normalizedText,
          fingerprint: input.fingerprint,
          sourceSnapshot: input.sourceSnapshot,
        });

        const saved = await repo.save(
          repo.create({
            id: existing?.id,
            source_post_id: input.sourcePostId,
            weibo_user_id: input.weiboUserId,
            task_id: input.taskId ?? null,
            extractor_version: extractorVersion,
            status: 'succeeded',
            attempt_count: (existing?.attempt_count ?? 0) + 1,
            extracted_summary: extracted.topicLabels.join(' / ') || extracted.excerpt,
            extracted_json: extracted,
            error_message: null,
            last_extracted_at: new Date(),
          }),
        );

        return { reused: false, record: saved };
      } catch (error) {
        const failed = await repo.save(
          repo.create({
            id: existing?.id,
            source_post_id: input.sourcePostId,
            weibo_user_id: input.weiboUserId,
            task_id: input.taskId ?? null,
            extractor_version: extractorVersion,
            status: 'failed',
            attempt_count: (existing?.attempt_count ?? 0) + 1,
            extracted_summary: null,
            extracted_json: null,
            error_message: error instanceof Error ? error.message : String(error),
            last_extracted_at: new Date(),
          }),
        );

        return { reused: false, record: failed };
      }
    });
  }

  async extractForUser(input: {
    taskId: string;
    weiboUserId: string;
    extractorVersion?: string;
    sourcePosts: Array<{
      id: string;
      content_fingerprint: string;
      normalized_text: string;
      source_snapshot: Record<string, unknown>;
    }>;
    onProgress?: (progress: {
      processedCount: number;
      total: number;
      reusedCount: number;
      extractedCount: number;
      failedCount: number;
      latestSourcePostId: string;
      latestStatus: 'active' | 'retrying' | 'succeeded' | 'failed';
      latestWarning: string | null;
      warnings: string[];
      phase: 'active' | 'retrying' | 'completed';
      message: string;
      attempt: number;
      maxAttempts: number;
    }) => void | Promise<void>;
  }): Promise<{
    extractorVersion: string;
    total: number;
    reusedCount: number;
    extractedCount: number;
    failedCount: number;
    warnings: string[];
    items: any[];
  }> {
    const items: any[] = [];
    const warnings: string[] = [];
    let reusedCount = 0;
    let extractedCount = 0;
    let failedCount = 0;
    const retryLimit = this.resolveExtractorRetryLimit();
    const total = input.sourcePosts.length;

    const emitProgress = async (progress: {
      processedCount: number;
      reusedCount: number;
      extractedCount: number;
      failedCount: number;
      latestSourcePostId: string;
      latestStatus: 'active' | 'retrying' | 'succeeded' | 'failed';
      latestWarning: string | null;
      warnings: string[];
      phase: 'active' | 'retrying' | 'completed';
      message: string;
      attempt: number;
      maxAttempts: number;
    }) => {
      await Promise.resolve(
        input.onProgress?.({
          ...progress,
          total,
        }),
      ).catch((error) => {
        console.error('[UserProfilePostExtractionService] progress callback failed:', error);
      });
    };

    for (const [index, sourcePost] of input.sourcePosts.entries()) {
      const maxAttempts = retryLimit + 1;
      let attempt = 0;
      let result: { reused: boolean; record: any } | null = null;

      while (attempt < maxAttempts) {
        attempt += 1;
        const baseProcessedCount = reusedCount + extractedCount + failedCount;
        await emitProgress({
          processedCount: baseProcessedCount,
          reusedCount,
          extractedCount,
          failedCount,
          latestSourcePostId: sourcePost.id,
          latestStatus: 'active',
          latestWarning: warnings.at(-1) ?? null,
          warnings: [...warnings],
          phase: 'active',
          message: `正在抽取第 ${index + 1}/${total} 条帖子（第 ${attempt}/${maxAttempts} 次尝试）`,
          attempt,
          maxAttempts,
        });

        const stopHeartbeat = this.startProgressHeartbeat({
          heartbeatMs: this.resolveExtractorProgressHeartbeatMs(),
          onTick: async (elapsedMs) => {
            await emitProgress({
              processedCount: baseProcessedCount,
              reusedCount,
              extractedCount,
              failedCount,
              latestSourcePostId: sourcePost.id,
              latestStatus: 'active',
              latestWarning: warnings.at(-1) ?? null,
              warnings: [...warnings],
              phase: 'active',
              message: `正在抽取第 ${index + 1}/${total} 条帖子（第 ${attempt}/${maxAttempts} 次尝试），已等待 ${this.formatElapsedSeconds(elapsedMs)}`,
              attempt,
              maxAttempts,
            });
          },
        });

        try {
          result = await this.resolveExtraction({
            sourcePostId: sourcePost.id,
            weiboUserId: input.weiboUserId,
            extractorVersion: input.extractorVersion,
            fingerprint: sourcePost.content_fingerprint,
            normalizedText: sourcePost.normalized_text,
            sourceSnapshot: sourcePost.source_snapshot,
            taskId: input.taskId,
          });
        } finally {
          stopHeartbeat();
        }

        if (
          result.reused ||
          result.record.status === 'succeeded' ||
          attempt >= maxAttempts ||
          !this.isRetryableExtractionFailure(result.record.error_message)
        ) {
          break;
        }

        await emitProgress({
          processedCount: baseProcessedCount,
          reusedCount,
          extractedCount,
          failedCount,
          latestSourcePostId: sourcePost.id,
          latestStatus: 'retrying',
          latestWarning: warnings.at(-1) ?? null,
          warnings: [...warnings],
          phase: 'retrying',
          message: `帖子 ${sourcePost.id} 抽取失败，准备第 ${attempt + 1}/${maxAttempts} 次重试`,
          attempt,
          maxAttempts,
        });
      }

      if (!result) {
        continue;
      }

      items.push(result.record);
      if (result.reused) {
        reusedCount += 1;
      } else if (result.record.status === 'succeeded') {
        extractedCount += 1;
      } else {
        failedCount += 1;
        warnings.push(`帖子 ${sourcePost.id} 提取失败：${result.record.error_message}`);
      }

      const latestWarning = warnings.at(-1) ?? null;
      await emitProgress({
          processedCount: reusedCount + extractedCount + failedCount,
          reusedCount,
          extractedCount,
          failedCount,
          latestSourcePostId: sourcePost.id,
          latestStatus: result.record.status === 'failed' ? 'failed' : 'succeeded',
          latestWarning,
          warnings: [...warnings],
          phase: 'completed',
          message: `正在逐帖抽取，已处理 ${reusedCount + extractedCount + failedCount}/${total} 条帖子`,
          attempt,
          maxAttempts,
      });
    }

    return {
      extractorVersion: input.extractorVersion ?? DEFAULT_EXTRACTOR_VERSION,
      total: input.sourcePosts.length,
      reusedCount,
      extractedCount,
      failedCount,
      warnings,
      items,
    };
  }

  private async withRepo<T>(handler: (repo: ExtractionRepo) => Promise<T>): Promise<T> {
    if (this.extractionRepo) {
      return handler(this.extractionRepo);
    }

    return useEntityManager(async (manager) => {
      const repo = manager.getRepository(UserProfilePostExtractionEntity) as ExtractionRepo;
      return handler(repo);
    });
  }

  private async invokeExtractor(input: {
    normalizedText: string;
    fingerprint: string;
    sourceSnapshot: Record<string, unknown>;
  }): Promise<PostExtraction> {
    const model = useLlmModel({
      model: DEFAULT_EXTRACTOR_MODEL,
      temperature: 0.1,
    });
    const timeoutMs = this.resolveExtractorTimeoutMs();

    const messages = [
      {
        role: 'system',
        content:
          '你负责逐帖抽取微博内容中的主题、事件、观点、情绪、实体、风险和时间线索，只能返回 JSON。',
      },
      {
        role: 'human',
        content: JSON.stringify({
          text: input.normalizedText,
          fingerprint: input.fingerprint,
          sourceSnapshot: input.sourceSnapshot,
        }),
      },
    ];

    try {
      const response = await this.withTimeout(
        () => model.invoke(messages),
        timeoutMs,
        `帖子抽取超时（>${Math.ceil(timeoutMs / 1000)}s）`,
      );
      return this.parseExtractorResponse(response);
    } catch (error) {
      if (
        !this.isRecoverablePlainExtractorFailure(error) ||
        typeof (model as any).withStructuredOutput !== 'function'
      ) {
        throw error;
      }
    }

    const structuredModel = (model as any).withStructuredOutput(postExtractionSchema);
    const response = await this.withTimeout(
      () => structuredModel.invoke(messages),
      timeoutMs,
      `帖子结构化抽取超时（>${Math.ceil(timeoutMs / 1000)}s）`,
    );
    return postExtractionSchema.parse(response);
  }

  private parseExtractorResponse(response: unknown): PostExtraction {
    if (typeof response === 'string') {
      return this.parseExtractorJsonText(response);
    }

    if (response && typeof response === 'object') {
      const content = (response as { content?: unknown }).content;
      if (typeof content === 'string') {
        return this.parseExtractorJsonText(content);
      }

      if (Array.isArray(content)) {
        const text = content
          .map((item) => {
            if (typeof item === 'string') {
              return item;
            }
            if (item && typeof item === 'object' && 'text' in item) {
              return String((item as { text?: unknown }).text ?? '');
            }
            return '';
          })
          .join('\n')
          .trim();

        if (text) {
          return this.parseExtractorJsonText(text);
        }
      }

      return postExtractionSchema.parse(response);
    }

    return postExtractionSchema.parse(response);
  }

  private parseExtractorJsonText(text: string): PostExtraction {
    const normalized = this.normalizeJsonText(text);
    return postExtractionSchema.parse(JSON.parse(normalized));
  }

  private normalizeJsonText(text: string): string {
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

  private isRecoverablePlainExtractorFailure(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message || '';
    const stack = error.stack || '';

    return (
      error instanceof SyntaxError ||
      (error as { name?: string }).name === 'ZodError' ||
      /Unexpected token .* is not valid JSON/i.test(message) ||
      /Invalid input:/i.test(message) ||
      stack.includes('@langchain/openai/dist/utils/output.js')
    );
  }

  private isRetryableExtractionFailure(message: unknown): boolean {
    const normalized = String(message ?? '').toLowerCase();
    return [
      '超时',
      'timeout',
      'timed out',
      'fetch failed',
      'socket hang up',
      'econnreset',
      'econnrefused',
      '502',
      '503',
      '504',
      'bad gateway',
      'gateway timeout',
      'service unavailable',
    ].some((pattern) => normalized.includes(pattern));
  }

  private resolveExtractorTimeoutMs(): number {
    const timeoutMs = Number(process.env.USER_PROFILE_POST_EXTRACTION_TIMEOUT_MS);
    return Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_EXTRACTOR_TIMEOUT_MS;
  }

  private resolveExtractorRetryLimit(): number {
    const retryLimit = Number(process.env.USER_PROFILE_POST_EXTRACTION_RETRY_LIMIT);
    return Number.isInteger(retryLimit) && retryLimit >= 0
      ? retryLimit
      : DEFAULT_EXTRACTOR_RETRY_LIMIT;
  }

  private resolveExtractorProgressHeartbeatMs(): number {
    const heartbeatMs = Number(process.env.USER_PROFILE_POST_EXTRACTION_PROGRESS_HEARTBEAT_MS);
    return Number.isFinite(heartbeatMs) && heartbeatMs > 0
      ? heartbeatMs
      : DEFAULT_EXTRACTOR_PROGRESS_HEARTBEAT_MS;
  }

  private startProgressHeartbeat(input: {
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

  private formatElapsedSeconds(elapsedMs: number): string {
    return `${Math.max(1, Math.round(elapsedMs / 1000))} 秒`;
  }

  private async withTimeout<T>(
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
}
