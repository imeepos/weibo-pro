/**
 * 用户画像帖子抽取的进度发射器工厂。
 * 统一处理 total 注入与回调异常兜底，避免业务循环内重复编写。
 */
import type {
  ExtractionProgress,
  ExtractionProgressListener,
} from './user-profile-post-extraction.types';

export function createProgressEmitter(input: {
  onProgress?: ExtractionProgressListener;
  total: number;
}): (progress: ExtractionProgress) => Promise<void> {
  return async (progress) => {
    await Promise.resolve(
      input.onProgress?.({
        ...progress,
        total: input.total,
      }),
    ).catch((error) => {
      console.error('[UserProfilePostExtractionService] progress callback failed:', error);
    });
  };
}
