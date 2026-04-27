import { Injectable } from '@sker/core';
import { Observable, of } from 'rxjs';
import { WeiboAjaxStatusesMymblogAst } from '@sker/workflow-ast';
import { WeiboAjaxStatusesMymblogAstVisitor } from '@sker/workflow-run';

@Injectable({ providedIn: 'root' })
export class UserHistoryCollectionService {
  constructor(
    private readonly visitor: Pick<WeiboAjaxStatusesMymblogAstVisitor, 'visit'>,
  ) {}

  async collect(input: {
    weiboUserId: string;
    uid: string;
    windowDays: number;
    taskId: string;
  }): Promise<void> {
    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = input.uid;

    await new Promise<void>((resolve, reject) => {
      const stream = this.visitor.visit(
        ast,
        of({ uid: input.uid }) as Observable<Record<string, unknown>>,
        { taskId: input.taskId, weiboUserId: input.weiboUserId, windowDays: input.windowDays },
      );

      stream.subscribe({
        complete: resolve,
        error: reject,
      });
    });
  }
}
