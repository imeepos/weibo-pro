import { Injectable, root } from '@sker/core';
import { Handler, NodeEvent, WorkflowGraphAst } from '@sker/workflow';
import { PostNLPLooperAst } from '@sker/workflow-ast';
import { PostsController } from '@sker/sdk';
import { Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';

/**
 * 帖子 NLP 循环器执行器
 *
 * 每次 nextPage=true 时，获取一批帖子 ID 并逐个发射
 */
@Injectable()
export class PostNLPLooperAstVisitor {
  @Handler(PostNLPLooperAst)
  visit(
    ast: PostNLPLooperAst,
    input$: Observable<Record<string, unknown>>,
    ctx: WorkflowGraphAst
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>((obs) => {
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$
        .pipe(
          concatMap(async (inputData) => {
            // 更新输入
            if (inputData) {
              Object.keys(inputData).forEach((key) => {
                (ast as unknown as Record<string, unknown>)[key] = inputData[key];
              });
            }
            // 通过 API 获取待 NLP 处理的帖子
            const postsController = root.get(PostsController);
            const cursor = typeof ast.inputCursor === 'string' ? ast.inputCursor : undefined;
            const response = await postsController.getPendingNLPPosts(cursor, ast.pageSize);
            const posts = response.posts;
            // 逐个发射 postId 和 event_id
            for (const post of posts) {
              ast.postId = post.id;
              ast.event_id = post.event_id;
              ast.emitCount += 1;
              obs.next({
                type: 'node_emit',
                id: ast.id,
                data: { postId: post.id, event_id: post.event_id, emitCount: ast.emitCount },
              });
            }

            // 更新游标（使用 API 返回的 cursor 毫秒字符串）
            if (response.cursor !== null) {
              ast.outputCursor = response.cursor;
              ast.hasMore = response.hasMore;
              if (ast.hasMore) {
                ast.emitCount += 1;
                obs.next({
                  type: 'node_emit',
                  id: ast.id,
                  data: { hasMore: ast.hasMore, outputCursor: ast.outputCursor, emitCount: ast.emitCount },
                });
                await new Promise(resolve => setTimeout(resolve, 1000 * 5 * Math.random()));
                // 不要 complete，等待下一次输入
              } else {
                ast.state = 'success';
                obs.next({ type: 'node_success', id: ast.id });
                obs.complete();
              }
            } else {
              ast.state = 'success';
              obs.next({ type: 'node_success', id: ast.id });
              obs.complete();
            }
          }),
        )
        .subscribe({
          complete: () => {
            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id });
            obs.complete();
          }
        });

      return () => {
        subscription.unsubscribe();
        obs.complete();
      };
    });
  }
}
