import { Inject, Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, StoreGetAst, StoreSetAst } from '@sker/workflow';
import { RedisClient } from '@sker/redis';
import { Observable } from 'rxjs';

/**
 * 工作流存储键命名空间
 * 用于区分工作流运行时存储和系统缓存
 */
const WORKFLOW_STORE_PREFIX = 'workflow:store:';

/**
 * 存储获取节点执行器
 *
 * 功能：从 Redis 读取工作流全局存储的数据
 * 跨工作流通信：不同工作流通过相同键名共享数据
 *
 * 数据作用域：
 * - 键使用 "workflow:store:" 前缀，与系统缓存隔离
 * - 所有工作流共享同一命名空间，实现跨工作流通信
 * - 数据持久化在 Redis，不受工作流生命周期影响
 */
@Injectable()
export class StoreGetAstVisitor {
  constructor(@Inject(RedisClient) private readonly redis: RedisClient) { }

  @Handler(StoreGetAst)
  visit(ast: StoreGetAst, input$: Observable<any>, ctx: any): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      const wrappedCtx = {
        ...ctx,
        abortSignal: abortController.signal
      };

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      input$.subscribe({
        next: (inputData) => {
          ast.emitCount += 1;
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as any)[key] = inputData[key];
            });
          }
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
        },
        complete: async () => {
          const handler = async () => {
            try {
              if (wrappedCtx.abortSignal?.aborted) {
                ast.state = 'fail';
                setAstError(ast, new Error('工作流已取消'));
                obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                obs.complete();
                return;
              }

              const { key } = ast;

              if (!key) {
                throw new Error('键名不能为空');
              }

              const redisKey = `${WORKFLOW_STORE_PREFIX}${key}`;
              const value = await this.redis.get<any>(redisKey);

              ast.value = value;
              obs.next({ type: 'node_runing', id: ast.id });

              console.log(`[StoreGet] 读取成功: key=${key}, exists=${value !== null}`);

              ast.state = 'success';
              obs.next({ type: 'node_success', id: ast.id });
              obs.complete();
            } catch (error) {
              ast.state = 'fail';
              setAstError(ast, error, process.env.NODE_ENV === 'development');
              console.error(`[StoreGetAstVisitor] key=${ast.key}`, error);
              obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
              obs.complete();
            }
          };

          handler();
        }
      });

      return () => {
        abortController.abort();
        obs.complete();
      };
    });
  }
}

/**
 * 存储设置节点执行器
 *
 * 功能：将数据写入 Redis 工作流全局存储
 * 跨工作流通信：写入的数据可被其他工作流读取
 *
 * 特性：
 * - 默认 TTL 为 7 天（604800 秒），防止数据永久占用内存
 * - 支持任意 JSON 可序列化数据类型
 * - 写入后立即返回值，支持链式传递
 */
@Injectable()
export class StoreSetAstVisitor {
  constructor(@Inject(RedisClient) private readonly redis: RedisClient) { }

  @Handler(StoreSetAst)
  visit(ast: StoreSetAst, input$: Observable<any>, ctx: any): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      const wrappedCtx = {
        ...ctx,
        abortSignal: abortController.signal
      };

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      input$.subscribe({
        next: (inputData) => {
          ast.emitCount += 1;
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as any)[key] = inputData[key];
            });
          }
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
        },
        complete: async () => {
          const handler = async () => {
            try {
              if (wrappedCtx.abortSignal?.aborted) {
                ast.state = 'fail';
                setAstError(ast, new Error('工作流已取消'));
                obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                obs.complete();
                return;
              }

              const { key, value } = ast;

              if (!key) {
                throw new Error('键名不能为空');
              }

              const redisKey = `${WORKFLOW_STORE_PREFIX}${key}`;

              // 默认7天过期时间，避免数据永久占用内存
              const ttl = 7 * 24 * 60 * 60; // 7 days
              await this.redis.set(redisKey, value, ttl);
              obs.next({ type: 'node_runing', id: ast.id });

              console.log(`[StoreSet] 写入成功: key=${key}, ttl=${ttl}s`);

              ast.state = 'success';
              obs.next({ type: 'node_success', id: ast.id });
              obs.complete();
            } catch (error) {
              ast.state = 'fail';
              setAstError(ast, error, process.env.NODE_ENV === 'development');
              console.error(`[StoreSetAstVisitor] key=${ast.key}`, error);
              obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
              obs.complete();
            }
          };

          handler();
        }
      });

      return () => {
        abortController.abort();
        obs.complete();
      };
    });
  }
}
