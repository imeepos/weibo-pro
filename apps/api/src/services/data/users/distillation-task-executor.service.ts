import type { UserInvestigationDossier } from '@sker/sdk';
import type { UserDossierService } from '../investigation/user-dossier.service';
import type { UserHistoryCollectionService } from '../investigation/user-history-collection.service';
import type { UserProfileAggregationService } from '../investigation/user-profile-aggregation.service';
import type { UserProfileDistillationService } from '../investigation/user-profile-distillation.service';
import type { UserProfilePostExtractionService } from '../investigation/user-profile-post-extraction.service';
import type { PersonaProjectionService } from '../investigation/persona-projection.service';
import { DEFAULT_POST_EXTRACTION_VERSION } from './constants';
import { mergeTaskProgress, mergeWarnings } from './distillation-task-state';
import type { DistillationTaskStateService } from './distillation-task-state.service';
import { registerSourcePostsForTask } from './source-post-registry';

export interface DistillationTaskExecutorDeps {
  stateService: DistillationTaskStateService;
  userDossierService: UserDossierService;
  userHistoryCollectionService: UserHistoryCollectionService;
  userProfileDistillationService: UserProfileDistillationService;
  personaProjectionService: PersonaProjectionService;
  postExtractionService: UserProfilePostExtractionService;
  aggregationService: UserProfileAggregationService;
}

// 蒸馏任务执行流水线：抓取 -> 抽取 -> 聚合 -> 画像 -> 发布
export class DistillationTaskExecutor {
  constructor(private readonly deps: DistillationTaskExecutorDeps) {}

  async execute(taskId: string): Promise<void> {
    let task = await this.deps.stateService.updateTask(taskId, (currentTask) => {
      currentTask.status = 'crawling';
      currentTask.started_at = new Date();
      currentTask.completed_at = null;
      currentTask.error_message = null;
      currentTask.warnings_json = [];
      currentTask.distilled_summary = '正在抓取历史发帖...';
      currentTask.source_post_count = 0;
      mergeTaskProgress(currentTask, {
        stage: 'crawling',
        latestMessage: '正在抓取历史发帖...',
      });
    });
    try {
      const collection = await this.deps.userHistoryCollectionService.collect({
        weiboUserId: task.weibo_user_id,
        uid: task.weibo_user_id,
        windowDays: task.history_window_days,
        taskId: task.id,
        onProgress: async (progress) => {
          await this.deps.stateService.updateTask(taskId, (currentTask) => {
            currentTask.source_post_count = progress.collectedPostCount;
            currentTask.distilled_summary = progress.message;
            currentTask.error_message = null;
            currentTask.warnings_json = mergeWarnings(currentTask.warnings_json, progress.warnings);
            mergeTaskProgress(currentTask, {
              stage: 'crawling',
              partial: progress.partial,
              latestMessage: progress.message,
              counters: {
                crawledPosts: progress.collectedPostCount,
                warningCount: (currentTask.warnings_json ?? []).length,
              },
              coverage: {
                latestPostAt: progress.latestPostAt,
                oldestPostAt: progress.oldestPostAt,
              },
              recentWarnings: (currentTask.warnings_json ?? []).slice(-3),
            });
          });
        },
      });
      const dossier = await this.deps.userDossierService.getDossier(task.weibo_user_id, {
        eventId: task.event_id ?? undefined,
        windowDays: task.history_window_days,
      });
      const sourcePosts = await registerSourcePostsForTask({
        taskId,
        weiboUserId: task.weibo_user_id,
        eventId: task.event_id ?? undefined,
        windowDays: task.history_window_days,
      });
      const collectionWarnings = mergeWarnings([], collection.warnings);
      task = await this.deps.stateService.updateTask(taskId, (currentTask) => {
        currentTask.status = 'extracting';
        currentTask.source_post_count = sourcePosts.length;
        currentTask.source_comment_count = dossier.historyCoverage.collectedCommentCount;
        currentTask.source_repost_count = dossier.historyCoverage.collectedRepostCount;
        currentTask.warnings_json = collectionWarnings;
        currentTask.distilled_summary = `正在逐帖抽取，准备处理 ${sourcePosts.length} 条帖子`;
        mergeTaskProgress(currentTask, {
          stage: 'extracting',
          partial: collection.partial,
          latestMessage: `正在逐帖抽取，准备处理 ${sourcePosts.length} 条帖子`,
          counters: {
            crawledPosts: collection.collectedPostCount,
            warningCount: collectionWarnings.length,
          },
          coverage: {
            latestPostAt: collection.latestPostAt,
            oldestPostAt: collection.oldestPostAt,
          },
          recentWarnings: collectionWarnings.slice(-3),
        });
      });
      const extraction = await this.deps.postExtractionService.extractForUser({
        taskId,
        weiboUserId: task.weibo_user_id,
        extractorVersion: DEFAULT_POST_EXTRACTION_VERSION,
        sourcePosts,
        onProgress: async (progress) => {
          const extractionWarnings = mergeWarnings(collectionWarnings, progress.warnings);
          const processedCount = Math.min(progress.processedCount, progress.total);
          const latestMessage =
            progress.message || `正在逐帖抽取，已处理 ${processedCount}/${progress.total} 条帖子`;
          await this.deps.stateService.updateTask(taskId, (currentTask) => {
            currentTask.status = 'extracting';
            currentTask.source_post_count = sourcePosts.length;
            currentTask.warnings_json = extractionWarnings;
            currentTask.distilled_summary = latestMessage;
            mergeTaskProgress(currentTask, {
              stage: 'extracting',
              partial: collection.partial || progress.failedCount > 0,
              latestMessage,
              counters: {
                crawledPosts: collection.collectedPostCount,
                reusedExtractions: progress.reusedCount,
                extractedPosts: progress.extractedCount,
                failedPosts: progress.failedCount,
                warningCount: extractionWarnings.length,
              },
              coverage: {
                latestPostAt: collection.latestPostAt,
                oldestPostAt: collection.oldestPostAt,
              },
              recentWarnings: extractionWarnings.slice(-3),
            });
          });
        },
      });
      const combinedWarnings = mergeWarnings(collectionWarnings, extraction.warnings);
      let distillationWarnings = combinedWarnings;
      const aggregationInput = extraction.items
        .filter((item) => item?.status === 'succeeded' && item?.extracted_json)
        .map((item) => ({
          postId: item.source_post_id,
          createdAt: item.extracted_json?.temporalHints?.postCreatedAt ?? null,
          normalizedText: item.extracted_json?.excerpt ?? '',
          extracted: item.extracted_json,
        }));
      const aggregation = await this.deps.aggregationService.aggregate({
        dossier,
        extractions: aggregationInput,
      });
      task = await this.deps.stateService.updateTask(taskId, (currentTask) => {
        currentTask.status = 'aggregating';
        currentTask.source_post_count = Math.max(
          dossier.historyCoverage.collectedPostCount,
          sourcePosts.length,
        );
        currentTask.warnings_json = combinedWarnings;
        currentTask.distilled_summary = `正在聚合 ${extraction.total} 条帖子提取结果`;
        mergeTaskProgress(currentTask, {
          stage: 'aggregating',
          partial: collection.partial || extraction.failedCount > 0,
          latestMessage: `正在聚合 ${extraction.total} 条帖子提取结果`,
          counters: {
            crawledPosts: collection.collectedPostCount,
            reusedExtractions: extraction.reusedCount,
            extractedPosts: extraction.extractedCount,
            failedPosts: extraction.failedCount,
            eventClusterCount: aggregation.stats?.totalEvents ?? aggregation.tree?.length ?? 0,
            coordinationSignalCount: aggregation.coordinationSignals?.length ?? 0,
            warningCount: combinedWarnings.length,
          },
          coverage: {
            latestPostAt: collection.latestPostAt,
            oldestPostAt: collection.oldestPostAt,
          },
          recentWarnings: combinedWarnings.slice(-3),
        });
      });

      const profile = await this.deps.stateService.runWithTaskHeartbeat(taskId, async () => {
        const distillFromAggregatedInput = (
          this.deps.userProfileDistillationService as UserProfileDistillationService & {
            distillFromAggregatedInput?: (input: {
              dossier: UserInvestigationDossier;
              tree: any[];
              timeline: any[];
              coordinationSignals: any[];
              extractions: Array<Record<string, unknown>>;
            }) => Promise<any>;
          }
        ).distillFromAggregatedInput;

        if (aggregationInput.length === 0) {
          distillationWarnings = mergeWarnings(distillationWarnings, [
            '逐帖抽取未产出成功样本，已回退到原始 dossier 蒸馏',
          ]);
          return this.deps.userProfileDistillationService.distill(dossier);
        }

        if (typeof distillFromAggregatedInput === 'function') {
          try {
            return await distillFromAggregatedInput.call(this.deps.userProfileDistillationService, {
              dossier,
              tree: aggregation.tree,
              timeline: aggregation.timeline,
              coordinationSignals: aggregation.coordinationSignals,
              extractions: aggregationInput.map((item) => item.extracted),
            });
          } catch (error) {
            distillationWarnings = mergeWarnings(distillationWarnings, [
              `聚合画像生成失败，已回退到原始 dossier 蒸馏：${error instanceof Error ? error.message : String(error)}`,
            ]);
            return this.deps.userProfileDistillationService.distill(dossier);
          }
        }

        return this.deps.userProfileDistillationService.distill(dossier);
      });
      profile.metadata.extractorVersion ??= extraction.extractorVersion;
      profile.metadata.aggregationVersion ??= 'agg-v1';
      profile.metadata.eventWindowCount ??= aggregation.stats?.totalEvents ?? aggregation.tree?.length ?? 0;
      profile.metadata.coordinationSignalCount ??=
        aggregation.coordinationSignals?.length ?? 0;
      profile.metadata.warnings ??= distillationWarnings;
      const profileMetadataRecord = profile.metadata as Record<string, unknown>;
      profileMetadataRecord.graphTree = aggregation.tree;
      profileMetadataRecord.timeline = aggregation.timeline;
      profileMetadataRecord.coordinationSignals = aggregation.coordinationSignals;
      const reviewStatus =
        profile.risk.reviewRecommendation === 'auto_pass' ? 'auto_pass' : 'human_pending';

      await this.deps.stateService.updateTask(taskId, (currentTask) => {
        currentTask.status = 'publishing';
        currentTask.warnings_json = distillationWarnings;
        currentTask.distilled_summary =
          reviewStatus === 'auto_pass' ? '正在发布画像与知识图谱' : '画像生成完成，等待人工复核';
        mergeTaskProgress(currentTask, {
          stage: 'publishing',
          partial: collection.partial || extraction.failedCount > 0,
          latestMessage:
            reviewStatus === 'auto_pass' ? '正在发布画像与知识图谱' : '画像生成完成，等待人工复核',
          counters: {
            crawledPosts: collection.collectedPostCount,
            reusedExtractions: extraction.reusedCount,
            extractedPosts: extraction.extractedCount,
            failedPosts: extraction.failedCount,
            eventClusterCount: profile.metadata.eventWindowCount ?? 0,
            coordinationSignalCount: profile.metadata.coordinationSignalCount ?? 0,
            warningCount: distillationWarnings.length,
          },
          coverage: {
            latestPostAt: collection.latestPostAt,
            oldestPostAt: collection.oldestPostAt,
          },
          recentWarnings: distillationWarnings.slice(-3),
        });
      });

      if (reviewStatus === 'auto_pass') {
        await this.deps.personaProjectionService.publishProfile({
          ...profile,
          weiboUserId: dossier.accountSnapshot.weiboUserId,
          screenName:
            dossier.accountSnapshot.screenName ??
            dossier.accountSnapshot.displayName ??
            dossier.accountSnapshot.weiboUserId,
          avatar: dossier.accountSnapshot.avatar,
        });
      }

      await this.deps.stateService.updateTask(taskId, (currentTask) => {
        currentTask.model = profile.metadata.model;
        currentTask.prompt_version = profile.metadata.promptVersion;
        currentTask.distilled_summary = profile.summary.short;
        currentTask.distilled_json = profile as unknown as Record<string, unknown>;
        currentTask.warnings_json = distillationWarnings;
        currentTask.review_status = reviewStatus;
        currentTask.source_post_count = profile.metadata.sampledPosts;
        currentTask.source_comment_count = profile.metadata.sampledComments;
        currentTask.source_repost_count = profile.metadata.sampledReposts;
        currentTask.evidence_sample_count = profile.memoryDrafts.reduce(
          (sum: number, item: any) => sum + item.evidenceRefs.length,
          0,
        );
        currentTask.status = reviewStatus === 'auto_pass' ? 'published' : 'review_pending';
        currentTask.completed_at = new Date();
        currentTask.error_message = null;
      });
    } catch (error) {
      await this.deps.stateService.updateTask(taskId, (currentTask) => {
        currentTask.status = 'failed';
        currentTask.error_message = error instanceof Error ? error.message : String(error);
        currentTask.completed_at = new Date();
      });
    }
  }
}
