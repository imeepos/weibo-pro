/**
 * 微博用户历史发帖（mymblog）分页抓取与重试逻辑。
 */
import { ErrorClassifier } from "./utils/error-handler.util";
import {
    PageRetryExhaustedError,
    TimelineCollectionResult,
    WeiboAjaxStatusesMymblogAstResponse,
} from "./weibo-ajax-statuses-mymblog.types";

export interface FetchPageWithRetryContext {
    ast: { uid: string };
    page: number;
    maxRetries: number;
    baseProgress: TimelineCollectionResult;
    emitProgress: (progress: TimelineCollectionResult, status: 'executing') => void;
    fetchApi: (options: { url: string; refererOptions: { uid?: string; mid?: string } }) => Promise<WeiboAjaxStatusesMymblogAstResponse>;
    randomDelay: (min: number, max: number) => Promise<unknown>;
}

export async function fetchPageWithRetry(
    context: FetchPageWithRetryContext,
): Promise<WeiboAjaxStatusesMymblogAstResponse> {
    const {
        ast,
        page,
        maxRetries,
        baseProgress,
        emitProgress,
        fetchApi,
        randomDelay,
    } = context;

    let attempt = 0;

    while (true) {
        emitProgress({
            ...baseProgress,
            message: attempt === 0
                ? `正在抓取第 ${page} 页`
                : `第 ${page} 页抓取失败，正在重试 ${attempt}/${maxRetries}`,
        }, 'executing');

        try {
            return await fetchApi({
                url: `https://weibo.com/ajax/statuses/mymblog?uid=${ast.uid}&page=${page}&feature=0`,
                refererOptions: { uid: ast.uid },
            });
        } catch (error) {
            if (!ErrorClassifier.isRetryable(error)) {
                throw error;
            }

            if (attempt >= maxRetries) {
                throw new PageRetryExhaustedError(page, maxRetries + 1, error);
            }

            attempt += 1;
            await randomDelay(1, 2);
        }
    }
}
