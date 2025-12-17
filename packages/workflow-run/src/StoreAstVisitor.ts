import { Inject, Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, StoreGetAst, StoreSetAst } from '@sker/workflow';
import { RedisClient } from '@sker/redis';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';

const WORKFLOW_STORE_PREFIX = 'workflow:store:';

@Injectable()
export class StoreGetAstVisitor {
  constructor(@Inject(RedisClient) private readonly redis: RedisClient) { }

  @Handler(StoreGetAst)
  visit(ast: StoreGetAst, input$: Observable<any>, ctx: any): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as any)[key] = inputData[key];
            });
          }

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消');
          }

          const { key } = ast;
          if (!key) {
            throw new Error('键名不能为空');
          }

          const redisKey = `${WORKFLOW_STORE_PREFIX}${key}`;
          ast.value = await this.redis.get<any>(redisKey);

          console.log(`[StoreGet] 读取成功: key=${key}, exists=${ast.value !== null}`);

          return [
            { type: 'node_emit' as const, id: ast.id, data: { value: ast.value } }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error, process.env.NODE_ENV === 'development');
          console.error(`[StoreGetAstVisitor] key=${ast.key}`, error);
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
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }
}

@Injectable()
export class StoreSetAstVisitor {
  constructor(@Inject(RedisClient) private readonly redis: RedisClient) { }

  @Handler(StoreSetAst)
  visit(ast: StoreSetAst, input$: Observable<any>, ctx: any): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as any)[key] = inputData[key];
            });
          }

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消');
          }

          const { key, value } = ast;
          if (!key) {
            throw new Error('键名不能为空');
          }

          const redisKey = `${WORKFLOW_STORE_PREFIX}${key}`;
          const ttl = 7 * 24 * 60 * 60;
          await this.redis.set(redisKey, value, ttl);

          console.log(`[StoreSet] 写入成功: key=${key}, ttl=${ttl}s`);

          return [
            { type: 'node_emit' as const, id: ast.id, data: { value } }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error, process.env.NODE_ENV === 'development');
          console.error(`[StoreSetAstVisitor] key=${ast.key}`, error);
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
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }
}
