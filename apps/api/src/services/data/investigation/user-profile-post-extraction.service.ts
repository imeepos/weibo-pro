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

type ExtractionRepo = {
  findOne: (input: unknown) => Promise<any>;
  create: (input: Record<string, unknown>) => any;
  save: (input: Record<string, unknown>) => Promise<any>;
};

@Injectable({ providedIn: 'root' })
export class UserProfilePostExtractionService {
  constructor(private readonly extractionRepo?: ExtractionRepo) {}

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
      latestStatus: 'succeeded' | 'failed';
      latestWarning: string | null;
      warnings: string[];
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

    for (const sourcePost of input.sourcePosts) {
      const result = await this.resolveExtraction({
        sourcePostId: sourcePost.id,
        weiboUserId: input.weiboUserId,
        extractorVersion: input.extractorVersion,
        fingerprint: sourcePost.content_fingerprint,
        normalizedText: sourcePost.normalized_text,
        sourceSnapshot: sourcePost.source_snapshot,
        taskId: input.taskId,
      });

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
      await Promise.resolve(
        input.onProgress?.({
          processedCount: reusedCount + extractedCount + failedCount,
          total: input.sourcePosts.length,
          reusedCount,
          extractedCount,
          failedCount,
          latestSourcePostId: sourcePost.id,
          latestStatus: result.record.status === 'failed' ? 'failed' : 'succeeded',
          latestWarning,
          warnings: [...warnings],
        }),
      ).catch((error) => {
        console.error('[UserProfilePostExtractionService] progress callback failed:', error);
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

    if (typeof (model as any).withStructuredOutput === 'function') {
      const structuredModel = (model as any).withStructuredOutput(postExtractionSchema);
      const response = await structuredModel.invoke(messages);
      return postExtractionSchema.parse(response);
    }

    const response = await model.invoke(messages);
    return this.parseExtractorResponse(response);
  }

  private parseExtractorResponse(response: unknown): PostExtraction {
    if (typeof response === 'string') {
      return postExtractionSchema.parse(JSON.parse(response));
    }

    if (response && typeof response === 'object') {
      const content = (response as { content?: unknown }).content;
      if (typeof content === 'string') {
        return postExtractionSchema.parse(JSON.parse(content));
      }

      return postExtractionSchema.parse(response);
    }

    return postExtractionSchema.parse(response);
  }
}
