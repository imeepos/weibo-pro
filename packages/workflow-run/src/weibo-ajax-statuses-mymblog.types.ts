/**
 * 微博用户历史发帖（mymblog）抓取相关的类型与错误定义。
 */

export interface WeiboAjaxStatusesMymblogAstResponse {
    ok: number;
    data: {
        list: unknown[];
    }
}

export interface WeiboTimelineCollectionProgress {
    page: number;
    collectedPostCount: number;
    newPostCount: number;
    duplicatePostCount: number;
    failedPageCount: number;
    latestPostAt: string | null;
    oldestPostAt: string | null;
    partial: boolean;
    warnings: string[];
    message: string;
}

export interface TimelineCollectionResult extends WeiboTimelineCollectionProgress {}

export interface TimelinePageIngestResult {
    collectedCount: number;
    newCount: number;
    duplicateCount: number;
    reachedHistoryBoundary: boolean;
    latestPostAt: Date | null;
    oldestPostAt: Date | null;
    sanitizedUserRefCount: number;
}

export class PageRetryExhaustedError extends Error {
    constructor(
        readonly page: number,
        readonly attempts: number,
        readonly cause: unknown,
    ) {
        super(`第 ${page} 页抓取在 ${attempts} 次尝试后仍失败`);
        this.name = 'PageRetryExhaustedError';
    }
}
