import { Injectable } from '@sker/core';
import { Handler, NodeEvent, WorkflowGraphAst } from '@sker/workflow';
import { PostNLPLooperAst } from '@sker/workflow-ast';
import { PostProcessFlags, useEntityManager, WeiboPostEntity } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { ErrorHandlerOperators } from './utils/error-handler.util';

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
            console.log(`[PostNLPLooperAst] 接收到输入 inputCursor=${ast.inputCursor}`, inputData);
            // 查询未完成 NLP 的帖子（位标志判断）
            const posts = await useEntityManager(async (manager) => {
              const qb = manager
                .createQueryBuilder(WeiboPostEntity, 'post')
                .where('(post.process_flags & :nlpFlag) = 0', {
                  nlpFlag: PostProcessFlags.NLP_COMPLETED,
                })
                .andWhere('post.deleted_at IS NULL')
                .orderBy('post.ingested_at', 'ASC')
                .limit(ast.pageSize);

              if (typeof ast.inputCursor === 'string') {
                qb.andWhere('post.ingested_at > :inputCursor', {
                  inputCursor: new Date(ast.inputCursor),
                });
              }

              return await qb.getMany();
            });
            console.log(`[PostNLPLooperAst] 查询到 ${posts.length} 条帖子，pageSize=${ast.pageSize}`);
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
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.random()));
            }

            // 更新游标
            if (posts.length > 0) {
              ast.outputCursor = posts.at(-1)!.ingested_at.toISOString();
              ast.hasMore = posts.length >= ast.pageSize;
              console.log(`[PostNLPLooperAst] hasMore=${ast.hasMore}, outputCursor=${ast.outputCursor}`);
              if (ast.hasMore) {
                ast.emitCount += 1;
                console.log(`[PostNLPLooperAst] 还有更多数据，发射 hasMore=true，等待下一次输入`);
                obs.next({
                  type: 'node_emit',
                  id: ast.id,
                  data: { hasMore: ast.hasMore, outputCursor: ast.outputCursor, emitCount: ast.emitCount },
                });
                // 不要 complete，等待下一次输入
              } else {
                console.log(`[PostNLPLooperAst] 没有更多数据，发射 node_success 并完成`);
                ast.state = 'success';
                obs.next({ type: 'node_success', id: ast.id });
                obs.complete();
              }
            } else {
              console.log(`[PostNLPLooperAst] 没有查询到数据，发射 node_success 并完成`);
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
