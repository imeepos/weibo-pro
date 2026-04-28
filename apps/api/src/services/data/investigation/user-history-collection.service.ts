import { Inject, Injectable } from '@sker/core';
import { Observable, of } from 'rxjs';
import { WeiboAjaxStatusesMymblogAst } from '@sker/workflow-ast';
import {
  WeiboAjaxStatusesMymblogAstVisitor,
  type WeiboTimelineCollectionProgress,
} from '@sker/workflow-run';

export interface UserHistoryCollectionResult extends WeiboTimelineCollectionProgress {
  status: 'completed' | 'partial';
}

@Injectable({ providedIn: 'root' })
export class UserHistoryCollectionService {
  constructor(
    @Inject(WeiboAjaxStatusesMymblogAstVisitor)
    private readonly visitor: WeiboAjaxStatusesMymblogAstVisitor,
  ) {}

  async collect(input: {
    weiboUserId: string;
    uid: string;
    windowDays: number;
    taskId: string;
    onProgress?: (progress: WeiboTimelineCollectionProgress) => void | Promise<void>;
  }): Promise<UserHistoryCollectionResult> {
    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = input.uid;
    const timeoutMs =
      Number(process.env.USER_HISTORY_COLLECTION_NO_PROGRESS_TIMEOUT_MS) ||
      Number(process.env.USER_HISTORY_COLLECTION_TIMEOUT_MS) ||
      300000;
    const retryLimitValue = Number(
      process.env.USER_HISTORY_COLLECTION_NO_PROGRESS_RETRY_LIMIT,
    );
    const retryLimit =
      Number.isInteger(retryLimitValue) && retryLimitValue >= 0 ? retryLimitValue : 2;

    return await new Promise<UserHistoryCollectionResult>((resolve, reject) => {
      let settled = false;
      let subscription: { unsubscribe: () => void } | undefined;
      let latestResult: UserHistoryCollectionResult = {
        status: 'completed',
        page: 0,
        collectedPostCount: 0,
        newPostCount: 0,
        duplicatePostCount: 0,
        failedPageCount: 0,
        latestPostAt: null,
        oldestPostAt: null,
        partial: false,
        warnings: [],
        message: '历史发帖抓取完成',
      };
      let timer: ReturnType<typeof setTimeout>;
      let retryCount = 0;

      const finish = (handler: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        handler();
      };

      const startSubscription = () => {
        subscription = this.visitor
          .visit(
            ast,
            of({ uid: input.uid }) as Observable<Record<string, unknown>>,
            { taskId: input.taskId, weiboUserId: input.weiboUserId, windowDays: input.windowDays },
          )
          .subscribe({
            next: handleEvent,
            complete: () => finish(() => resolve(latestResult)),
            error: (error) => finish(() => reject(error)),
          });
      };

      const resetTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (retryCount < retryLimit) {
            retryCount += 1;
            subscription?.unsubscribe();
            latestResult = {
              ...latestResult,
              warnings: [
                ...latestResult.warnings,
                `历史发帖抓取长时间无进展，开始第 ${retryCount} 次重试`,
              ],
            };
            startSubscription();
            resetTimer();
            return;
          }

          finish(() => {
            subscription?.unsubscribe();
            resolve({
              ...latestResult,
              status: 'partial',
              partial: true,
              warnings: [
                ...latestResult.warnings,
                `历史发帖抓取长时间无进展，第 ${retryLimit} 次重试后结束抓取并继续分析`,
              ],
              message:
                latestResult.collectedPostCount > 0
                  ? `历史发帖抓取长时间无进展，已基于已处理的 ${latestResult.collectedPostCount} 条帖子继续分析`
                  : '历史发帖抓取长时间无进展，已跳过抓取并继续分析',
            });
          });
        }, timeoutMs);
      };

      const handleEvent = (event: any) => {
        if (event?.type === 'node_progress' && event.data) {
          latestResult = {
            status: event.data.partial ? 'partial' : 'completed',
            page: event.data.page ?? latestResult.page,
            collectedPostCount: event.data.collectedPostCount ?? latestResult.collectedPostCount,
            newPostCount: event.data.newPostCount ?? latestResult.newPostCount,
            duplicatePostCount: event.data.duplicatePostCount ?? latestResult.duplicatePostCount,
            failedPageCount: event.data.failedPageCount ?? latestResult.failedPageCount,
            latestPostAt: event.data.latestPostAt ?? latestResult.latestPostAt,
            oldestPostAt: event.data.oldestPostAt ?? latestResult.oldestPostAt,
            partial: event.data.partial ?? latestResult.partial,
            warnings: event.data.warnings ?? latestResult.warnings,
            message: event.data.message ?? latestResult.message,
          };
          retryCount = 0;
          resetTimer();
          void Promise.resolve(input.onProgress?.(latestResult)).catch((error) => {
            console.error('[UserHistoryCollectionService] progress callback failed:', error);
          });
        }

        if (event?.type === 'node_fail') {
          const failureMessage =
            typeof event.error === 'string' && event.error.trim().length > 0
              ? event.error.trim()
              : '用户历史回填失败';

          if (this.isRecoverableCollectionFailure(failureMessage)) {
            const warning = `历史发帖抓取遇到可恢复错误：${failureMessage}，已继续分析`;
            latestResult = {
              ...latestResult,
              status: 'partial',
              partial: true,
              warnings: this.mergeWarnings(latestResult.warnings, [warning]),
              message:
                latestResult.collectedPostCount > 0
                  ? `历史发帖抓取遇到可恢复错误，已基于已处理的 ${latestResult.collectedPostCount} 条帖子继续分析`
                  : '历史发帖抓取遇到可恢复错误，未获得新增帖子，已继续分析',
            };
            void Promise.resolve(input.onProgress?.(latestResult)).catch((error) => {
              console.error('[UserHistoryCollectionService] progress callback failed:', error);
            });
            finish(() => resolve(latestResult));
            return;
          }

          finish(() => reject(new Error(failureMessage)));
        }
      };

      startSubscription();
      resetTimer();
    });
  }

  private isRecoverableCollectionFailure(message: string): boolean {
    const normalized = message.toLowerCase();
    return [
      'fetch failed',
      'timeout',
      'timed out',
      'econnreset',
      'econnrefused',
      'enotfound',
      'eai_again',
      'und_err_connect_timeout',
      '502',
      '503',
      '504',
      'bad gateway',
      'gateway timeout',
      'service unavailable',
      'network error',
      'socket hang up',
    ].some((pattern) => normalized.includes(pattern));
  }

  private mergeWarnings(current: string[], incoming: string[]): string[] {
    return Array.from(new Set([...current, ...incoming]));
  }
}
