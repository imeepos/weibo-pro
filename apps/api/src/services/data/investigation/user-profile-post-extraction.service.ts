/**
 * 用户画像帖子抽取服务。
 * 负责按帖逐条调用大模型抽取主题/事件/情绪等结构化结果，
 * 支持结果复用、失败重试与进度上报。
 * 常量、类型、纯工具、LLM 抽取器与进度发射器分别抽离到独立模块。
 */
import { Injectable } from '@sker/core';
import { UserProfilePostExtractionEntity, useEntityManager } from '@sker/entities';
import type { PostExtraction } from './user-profile-post-extraction.schema';
import {
  DEFAULT_EXTRACTOR_VERSION,
  resolveExtractorProgressHeartbeatMs,
  resolveExtractorRetryLimit,
} from './user-profile-post-extraction.constants';
import type { ExtractionRepo } from './user-profile-post-extraction.types';
import { invokePostExtractor } from './user-profile-post-extraction.extractor';
import { createProgressEmitter } from './user-profile-post-extraction.progress';
import {
  formatElapsedSeconds,
  isRetryableExtractionFailure,
  startProgressHeartbeat,
} from './user-profile-post-extraction.utils';

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
    const retryLimit = resolveExtractorRetryLimit();
    const total = input.sourcePosts.length;
    const emitProgress = createProgressEmitter({ onProgress: input.onProgress, total });

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

        const stopHeartbeat = startProgressHeartbeat({
          heartbeatMs: resolveExtractorProgressHeartbeatMs(),
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
              message: `正在抽取第 ${index + 1}/${total} 条帖子（第 ${attempt}/${maxAttempts} 次尝试），已等待 ${formatElapsedSeconds(elapsedMs)}`,
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
          !isRetryableExtractionFailure(result.record.error_message)
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
    return invokePostExtractor(input);
  }
}
