/**
 * 用户画像帖子抽取服务共享类型定义。
 */

export type ExtractionRepo = {
  findOne: (input: unknown) => Promise<any>;
  create: (input: Record<string, unknown>) => any;
  save: (input: Record<string, unknown>) => Promise<any>;
};

export type ExtractionStatus = 'active' | 'retrying' | 'succeeded' | 'failed';
export type ExtractionPhase = 'active' | 'retrying' | 'completed';

/** 进度回调中不含 total 的载荷，total 由发射器在调用监听器时统一附加。 */
export type ExtractionProgress = {
  processedCount: number;
  reusedCount: number;
  extractedCount: number;
  failedCount: number;
  latestSourcePostId: string;
  latestStatus: ExtractionStatus;
  latestWarning: string | null;
  warnings: string[];
  phase: ExtractionPhase;
  message: string;
  attempt: number;
  maxAttempts: number;
};

export type ExtractionProgressListener = (
  progress: ExtractionProgress & { total: number },
) => void | Promise<void>;
