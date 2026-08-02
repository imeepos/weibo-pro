import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, MqPushAst, MqPullAst } from '@sker/workflow';
import { useQueue } from '@sker/mq';
import { Observable, EMPTY, from } from 'rxjs';
import { take, finalize, catchError, concatMap, mergeMap } from 'rxjs/operators';
import { ErrorHandlerOperators } from './utils/error-handler.util';

/**
 * 消息队列推送节点执行器
 *
 * 功能：将数据推送到 RabbitMQ 队列
 * 跨工作流通信：不同工作流通过相同队列名称实现消息传递
 */
@Injectable()
export class MqPushAstVisitor {
  @Handler(MqPushAst)
  visit(ast: MqPushAst, input$: Observable<Record<string, unknown>>, _ctx: Record<string, unknown>): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消');
          }

          const queue = useQueue(ast.queueName);
          await queue.producer.next(ast.input);

          ast.success = true;
          console.log(`[MqPush] 推送成功: queue=${queue.queueName}, data=`, ast.input);

          return [
            { type: 'node_emit' as const, id: ast.id, data: { success: ast.success } }
          ];
        }),
        ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[MqPushAstVisitor]' }),
        ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[MqPushAstVisitor]' }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          obs.next(event);
        },
        error: (error) => {
          ast.success = false;
          ast.state = 'fail';
          setAstError(ast, error, process.env.NODE_ENV === 'development');
          console.error(`[MqPushAstVisitor] queue=${ast.queueName}`, error);
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
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

/**
 * 消息队列拉取节点执行器
 *
 * 功能：从 RabbitMQ 队列逐条拉取消息，流式发射
 * 跨工作流通信：接收其他工作流推送的消息
 *
 * 优雅设计：
 * - 响应式监听：订阅 MQ consumer$，每收到一条消息就 emitting 一次
 * - 自动终止：达到 max 条消息或超时后自动结束
 * - 可配置参数：max（最多拉取次数）、timeout（超时时间）
 * - 自动 ACK：消息自动确认
 */
@Injectable()
export class MqPullAstVisitor {
  @Handler(MqPullAst)
  visit(ast: MqPullAst, input$: Observable<Record<string, unknown>>, _ctx: Record<string, unknown>): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      ast.state = 'running';
      ast.count += 1;
      obs.next({ type: 'node_runing', id: ast.id });

      input$.subscribe({
        next: (inputData) => {
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }

          const queue = useQueue(ast.queueName, { manualAck: false });
          const normalizedQueueName = queue.queueName;

          console.log(`[MqPull] 开始监听: queue=${normalizedQueueName}, max=${ast.max}`);

          const subscription = queue.consumer$
            .pipe(
              take(ast.max),
              catchError((error) => {
                if (error.name === 'TimeoutError') {
                  if (ast.emitCount > 0) {
                    return EMPTY;
                  } else {
                    throw new Error(`队列 ${normalizedQueueName} 内无消息`);
                  }
                }
                throw error;
              }),
              finalize(() => {
                console.log(`[MqPull] 监听结束: queue=${normalizedQueueName}, 共发射 ${ast.emitCount} 条消息`);
              })
            )
            .subscribe({
              next: (envelope) => {
                ast.output = envelope.message;
                ast.emitCount += 1;
                obs.next({ type: 'node_emit', id: ast.id, data: { output: ast.output } });
                console.log(`[MqPull] 收到消息: queue=${normalizedQueueName}, emitCount=${ast.emitCount}`);
              },
              error: (error) => {
                ast.state = 'fail';
                setAstError(ast, error, process.env.NODE_ENV === 'development');
                console.error(`[MqPullAstVisitor] queue=${normalizedQueueName}, 已发射=${ast.emitCount}条`, error);
                obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
              },
              complete: () => {
                ast.state = 'success';
                obs.next({ type: 'node_success', id: ast.id });
                obs.complete();
              }
            });

          if (abortController.signal.aborted) {
            subscription.unsubscribe();
          } else {
            abortController.signal.addEventListener('abort', () => {
              subscription.unsubscribe();
              ast.state = 'fail';
              setAstError(ast, new Error('工作流已取消'));
              obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
              obs.complete();
            });
          }
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error, process.env.NODE_ENV === 'development');
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
        },
        complete: () => {
          // MqPull 的完成由内部的 consumer$ 控制
        }
      });

      return () => {
        abortController.abort();
        obs.complete();
      };
    });
  }
}
