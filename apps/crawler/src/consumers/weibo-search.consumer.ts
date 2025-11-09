import { mergeMap, tap, retry } from 'rxjs';
import { useQueue } from '@sker/mq';
import { execute } from '@sker/workflow';
import { WeiboKeywordSearchAst } from '@sker/workflow-ast';

export interface WeiboSearchTask {
  keyword: string;
  startDate: string;
  endDate: string;
  page?: number;
}

export function startWeiboSearchConsumer() {
  const queue = useQueue<WeiboSearchTask>('weibo_search_queue');

  console.log('[WeiboSearchConsumer] 消费者启动');
  console.log(`  队列: ${queue.queueName}`);
  console.log(`  死信队列: ${queue.dlqName}`);

  const subscription = queue.consumer$
    .pipe(
      tap(envelope => {
        const { keyword, startDate, endDate } = envelope.message;
        console.log(`[WeiboSearchConsumer] 接收任务: ${keyword} [${startDate} ~ ${endDate}]`);
      }),
      mergeMap(
        async envelope => {
          const task = envelope.message;

          const ast = new WeiboKeywordSearchAst();
          ast.keyword = task.keyword;
          ast.startDate = new Date(task.startDate);
          ast.endDate = new Date(task.endDate);
          ast.page = task.page ?? 1;

          const result = await execute(ast, {});

          if (result.state === 'success') {
            console.log(`[WeiboSearchConsumer] 任务成功: ${task.keyword}`);
            envelope.ack();
          } else {
            console.error(`[WeiboSearchConsumer] 任务失败: ${task.keyword}`, result.error);
            envelope.nack(false);
          }

          return result;
        },
        5
      ),
      retry({
        count: 2,
        delay: 3000,
      })
    )
    .subscribe({
      error: err => console.error('[WeiboSearchConsumer] 异常:', err),
      complete: () => console.log('[WeiboSearchConsumer] 已关闭'),
    });

  return {
    subscription,
    stop: () => subscription.unsubscribe(),
  };
}
