import { Injectable } from '@sker/core';
import { Handler, INode, setAstError, MqPushAst, MqPullAst } from '@sker/workflow';
import { useQueue } from '@sker/mq';
import { Observable } from 'rxjs';
import { take, timeout } from 'rxjs/operators';

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

          const { queueName: rawQueueName, input } = ast;

          // 过滤队列名称中的换行符、制表符、空格等无效字符
          const queueName = rawQueueName?.trim().replace(/[\n\r\t]/g, '');

          if (!queueName) {
            throw new Error('队列名称不能为空');
          }

          const queue = useQueue(queueName);

          await queue.producer.next(input);

          ast.success = true;
          ast.state = 'emitting';
          obs.next({ ...ast });

          console.log(`[MqPush] 推送成功: queue=${queueName}, data=`, input);

          ast.state = 'success';
          obs.next({ ...ast });
          obs.complete();
        } catch (error) {
          ast.success = false;
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
 * 功能：从 RabbitMQ 队列拉取单条消息
 * 跨工作流通信：接收其他工作流推送的消息
 *
 * 注意：
 * - 使用超时机制（10秒），避免无限等待
 * - 消息自动 ACK
 * - 若队列为空，会抛出超时错误
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

          const { queueName: rawQueueName } = ast;

          // 过滤队列名称中的换行符、制表符、空格等无效字符
          const queueName = rawQueueName?.trim().replace(/[\n\r\t]/g, '');

          if (!queueName) {
            throw new Error('队列名称不能为空');
          }

          const queue = useQueue(queueName, { manualAck: false });

          // 从队列拉取一条消息，设置10秒超时
          const message = await new Promise<any>((resolve, reject) => {
            const subscription = queue.consumer$
              .pipe(
                take(1),
                timeout(10000)
              )
              .subscribe({
                next: (envelope) => {
                  resolve(envelope.message);
                },
                error: (error) => {
                  reject(error);
                }
              });

            // 取消信号处理
            if (wrappedCtx.abortSignal) {
              wrappedCtx.abortSignal.addEventListener('abort', () => {
                subscription.unsubscribe();
                reject(new Error('工作流已取消'));
              });
            }
          });

          ast.output = message;
          ast.state = 'emitting';
          obs.next({ ...ast });

          console.log(`[MqPull] 拉取成功: queue=${queueName}, data=`, message);

          ast.state = 'success';
          obs.next({ ...ast });
          obs.complete();
        } catch (error) {
          ast.state = 'fail';
          const errorMessage = error instanceof Error && error.name === 'TimeoutError'
            ? `队列 ${ast.queueName} 在10秒内无消息`
            : error;
          setAstError(ast, errorMessage, process.env.NODE_ENV === 'development');
          console.error(`[MqPullAstVisitor] queue=${ast.queueName}`, error);
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
