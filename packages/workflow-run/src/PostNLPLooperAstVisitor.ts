import { Injectable } from '@sker/core';
import { Handler, NodeEvent, WorkflowGraphAst } from '@sker/workflow';
import { PostNLPLooperAst } from '@sker/workflow-ast';
import { PostNLPResultEntity, useEntityManager, WeiboPostEntity } from '@sker/entities';
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

            // 只在 nextPage=true 时处理
            if (!ast.nextPage) {
              return [];
            }

            const events: NodeEvent[] = [];

            // 查询一批没有 NLP 的帖子
            const posts = await useEntityManager(async (manager) => {
              const qb = manager
                .createQueryBuilder(WeiboPostEntity, 'post')
                .leftJoin(
                  PostNLPResultEntity,
                  'nlp',
                  'nlp.post_id = CAST(post.id AS VARCHAR)'
                )
                .where(
                  'nlp.id IS NULL OR nlp.keywords IS NULL OR jsonb_array_length(nlp.keywords) = 0 OR nlp.sentiment IS NULL'
                )
                .andWhere('post.deleted_at IS NULL')
                .orderBy('post.id', 'DESC')
                .limit(ast.pageSize);

              // 游标分页
              if (ast.cursorId) {
                qb.andWhere('CAST(post.id AS BIGINT) < :cursorId', {
                  cursorId: ast.cursorId,
                });
              }

              return await qb.getMany();
            });

            // 逐个发射 postId
            for (const post of posts) {
              ast.postId = post.id;
              events.push({
                type: 'node_emit',
                id: ast.id,
                data: { postId: post.id },
              });
            }

            // 更新游标
            if (posts.length > 0) {
              ast.cursorId = posts.at(-1)!.id;
            }

            return events;
          }),
          ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[PostNLPLooperAstVisitor]' }),
          ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[PostNLPLooperAstVisitor]' }),
          concatMap((events) => from(events))
        )
        .subscribe({
          next: (event) => obs.next(event),
          error: (error) => {
            ast.state = 'fail';
            obs.next({ type: 'node_fail', id: ast.id, error: error.message });
          },
          complete: () => {
            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id });
            obs.complete();
          },
        });

      return () => {
        subscription.unsubscribe();
        obs.complete();
      };
    });
  }
}
