import { Injectable } from '@sker/core';
import { Handler, INode, setAstError, MqPushAst, MqPullAst } from '@sker/workflow';
import { useQueue } from '@sker/mq';
import { Observable, EMPTY } from 'rxjs';
import { take, timeout, finalize, catchError, map } from 'rxjs/operators';

/**
 * 消息队列推送节点执行器
 *
 * 功能：将数据推送到 RabbitMQ 队列
 * 跨工作流通信：不同工作流通过相同队列名称实现消息传递
 */
@Injectable()
export class MqPushAstVisitor {
  @Handler(MqPushAst)
  visit(ast: MqPushAst, ctx: any): Observable<INode> {
    return new Observable<INode>(obs => {
      const abortController = new AbortController();

      const wrappedCtx = {
        ...ctx,
        abortSignal: abortController.signal
      };

      const handler = async () => {
        try {
          if (wrappedCtx.abortSignal?.aborted) {
            ast.state = 'fail';
            setAstError(ast, new Error('工作流已取消'));
            obs.next({ ...ast });
            obs.complete();
            return;
          }

          ast.state = 'running';
          ast.count += 1;
          obs.next({ ...ast });

          // useQueue 内部会自动规范化队列名，无需在此过滤
          const queue = useQueue(ast.queueName);

          await queue.producer.next(ast.input);

          ast.success.next(true);
          obs.next({ ...ast });

          console.log(`[MqPush] 推送成功: queue=${queue.queueName}, data=`, ast.input);

          ast.state = 'success';
          obs.next({ ...ast });
          obs.complete();
        } catch (error) {
          ast.success.next(false);
          ast.state = 'fail';
          setAstError(ast, error, process.env.NODE_ENV === 'development');
          console.error(`[MqPushAstVisitor] queue=${ast.queueName}`, error);
          obs.next({ ...ast });
          obs.complete();
        }
      };

      handler();

      return () => {
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
  visit(ast: MqPullAst, ctx: any): Observable<INode> {
    return new Observable<INode>(obs => {
      const abortController = new AbortController();

      const wrappedCtx = {
        ...ctx,
        abortSignal: abortController.signal
      };

      // 检查工作流是否已取消
      if (wrappedCtx.abortSignal?.aborted) {
        ast.state = 'fail';
        setAstError(ast, new Error('工作流已取消'));
        obs.next({ ...ast });
        obs.complete();
        return;
      }

      // 发送 running 状态
      ast.state = 'running';
      ast.count += 1;
      obs.next({ ...ast });

      // useQueue 内部会自动规范化队列名
      const queue = useQueue(ast.queueName, { manualAck: false });
      const normalizedQueueName = queue.queueName;

      console.log(`[MqPull] 开始监听: queue=${normalizedQueueName}, max=${ast.max}`);

      // 订阅消息队列，响应式流式处理
      const subscription = queue.consumer$
        .pipe(
          take(ast.max),
          catchError((error) => {
            // 超时错误处理
            if (error.name === 'TimeoutError') {
              // 如果已经发射过消息，超时视为队列已清空，正常结束
              if (ast.emitCount > 0) {
                return EMPTY; // 返回空流，正常结束
              } else {
                // 一条消息都没收到就超时
                throw new Error(`队列 ${normalizedQueueName} 内无消息`);
              }
            }
            throw error;
          }),
          finalize(() => {
            // 流结束时的清理逻辑
            console.log(`[MqPull] 监听结束: queue=${normalizedQueueName}, 共发射 ${ast.emitCount} 条消息`);
          })
        )
        .subscribe({
          next: (envelope) => {
            // 每收到一条消息就 emitting 一次
            ast.output = envelope.message;
            ast.emitCount += 1;
            obs.next({ ...ast });

            console.log(`[MqPull] 收到消息: queue=${normalizedQueueName}, emitCount=${ast.emitCount}`);
          },
          error: (error) => {
            // 错误处理
            ast.state = 'fail';
            setAstError(ast, error, process.env.NODE_ENV === 'development');
            console.error(`[MqPullAstVisitor] queue=${normalizedQueueName}, 已发射=${ast.emitCount}条`, error);
            obs.next({ ...ast });
            obs.complete();
          },
          complete: () => {
            // 正常结束
            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
          }
        });

      // 监听工作流取消信号
      if (wrappedCtx.abortSignal) {
        wrappedCtx.abortSignal.addEventListener('abort', () => {
          subscription.unsubscribe();
          ast.state = 'fail';
          setAstError(ast, new Error('工作流已取消'));
          obs.next({ ...ast });
          obs.complete();
        });
      }

      // 返回清理函数
      return () => {
        subscription.unsubscribe();
      };
    });
  }
}
