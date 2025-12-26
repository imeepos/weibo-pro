import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { SqlExecuteAst } from '@sker/workflow-ast';
import { useEntityManager } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';

@Injectable()
export class SqlExecuteAstVisitor {
  @Handler(SqlExecuteAst)
  handler(
    ast: SqlExecuteAst,
    input$: Observable<Record<string, unknown>>,
    ctx: Record<string, unknown>
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      interface WrappedContext extends Record<string, unknown> {
        abortSignal: AbortSignal;
      }

      const wrappedCtx: WrappedContext = {
        ...ctx,
        abortSignal: abortController.signal
      };

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          if (!ast.sql) {
            throw new Error('SQL 语句不能为空');
          }

          // 构建参数对象
          const params: Record<string, any> = {};
          if (ast.parameters && ast.parameters.length > 0) {
            ast.parameters.forEach(param => {
              if (param.key) {
                params[param.key] = param.value;
              }
            });
          }

          console.log(`[SqlExecuteAstVisitor] 执行 SQL:`, ast.sql);
          console.log(`[SqlExecuteAstVisitor] 参数:`, params);

          const rawResults = await useEntityManager(async (manager) => {
            // 执行原生 SQL 查询
            return await manager.query(ast.sql, Object.values(params));
          });

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          // 解析结果
          let results: any[] = [];
          let affectedRows = 0;
          let columns: Array<{ name: string; type: string }> = [];

          if (Array.isArray(rawResults)) {
            // SELECT 查询返回数组
            results = rawResults;
            affectedRows = rawResults.length;

            // 提取列信息
            if (results.length > 0) {
              const firstRow = results[0];
              columns = Object.keys(firstRow).map(key => ({
                name: key,
                type: typeof firstRow[key]
              }));
            }
          } else if (typeof rawResults === 'object' && rawResults !== null) {
            // INSERT/UPDATE/DELETE 可能返回对象
            if ('affectedRows' in rawResults) {
              affectedRows = (rawResults as any).affectedRows;
            } else if ('affected' in rawResults) {
              affectedRows = (rawResults as any).affected;
            }
          }

          // 更新 AST 输出
          ast.results = results;
          ast.affectedRows = affectedRows;
          ast.columns = columns;

          console.log(`[SqlExecuteAstVisitor] 执行成功，影响 ${affectedRows} 行`);

          return [
            {
              type: 'node_emit' as const,
              id: ast.id,
              data: {
                results,
                affectedRows,
                columns
              }
            }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          console.error(`[SqlExecuteAstVisitor] 执行失败:`, error);
          ast.state = 'fail';
          setAstError(ast, error instanceof Error ? error : new Error(String(error)));
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id });
          obs.complete();
        }
      });

      return () => {
        console.log('[SqlExecuteAstVisitor] 订阅被取消，触发 AbortSignal');
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }
}
