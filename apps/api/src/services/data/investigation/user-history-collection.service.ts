import { Inject, Injectable } from '@sker/core';
import { Observable, of } from 'rxjs';
import { WeiboAjaxStatusesMymblogAst } from '@sker/workflow-ast';
import { WeiboAjaxStatusesMymblogAstVisitor } from '@sker/workflow-run';

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
  }): Promise<void> {
    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = input.uid;
    const timeoutMs = Number(process.env.USER_HISTORY_COLLECTION_TIMEOUT_MS) || 120000;

    await new Promise<void>((resolve, reject) => {
      const stream = this.visitor.visit(
        ast,
        of({ uid: input.uid }) as Observable<Record<string, unknown>>,
        { taskId: input.taskId, weiboUserId: input.weiboUserId, windowDays: input.windowDays },
      );

      let settled = false;
      let subscription: { unsubscribe: () => void } | undefined;
      const timer = setTimeout(() => {
        finish(() => {
          subscription?.unsubscribe();
          reject(new Error(`用户历史回填超时（>${Math.ceil(timeoutMs / 1000)}s）`));
        });
      }, timeoutMs);

      const finish = (handler: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        handler();
      };

      subscription = stream.subscribe({
        next: (event: { type?: string; error?: string }) => {
          if (event?.type === 'node_fail') {
            finish(() => reject(new Error(event.error || '用户历史回填失败')));
          }
        },
        complete: () => finish(resolve),
        error: (error) => finish(() => reject(error)),
      });
    });
  }
}
