import { mergeMap, tap, retry } from 'rxjs';
import { useQueue } from '@sker/mq';
import { execute } from '@sker/workflow';
import {
  WeiboAjaxStatusesShowAst,
  WeiboAjaxStatusesCommentAst,
  WeiboAjaxStatusesRepostTimelineAst,
} from '@sker/workflow-ast';

export interface WeiboDetailTask {
  postId: string;
  fetchComments?: boolean;
  fetchReposts?: boolean;
}

export function startWeiboDetailConsumer() {
  const queue = useQueue<WeiboDetailTask>('weibo_detail_queue');

  console.log('[WeiboDetailConsumer] 消费者启动');
  console.log(`  队列: ${queue.queueName}`);
  console.log(`  死信队列: ${queue.dlqName}`);

  const subscription = queue.consumer$
    .pipe(
      tap(envelope => {
        const { postId, fetchComments, fetchReposts } = envelope.message;
        console.log(`[WeiboDetailConsumer] 接收任务: ${postId} [评论:${fetchComments ?? true}, 转发:${fetchReposts ?? true}]`);
      }),
      mergeMap(
        async envelope => {
          const task = envelope.message;

          const showAst = new WeiboAjaxStatusesShowAst();
          showAst.id = task.postId;

          const result = await execute(showAst, {});

          if (task.fetchComments !== false) {
            const commentAst = new WeiboAjaxStatusesCommentAst();
            commentAst.id = task.postId;
            await execute(commentAst, {});
          }

          if (task.fetchReposts !== false) {
            const repostAst = new WeiboAjaxStatusesRepostTimelineAst();
            repostAst.id = task.postId;
            await execute(repostAst, {});
          }

          if (result.state === 'success') {
            console.log(`[WeiboDetailConsumer] 任务成功: ${task.postId}`);
            envelope.ack();
          } else {
            console.error(`[WeiboDetailConsumer] 任务失败: ${task.postId}`, result.error);
            envelope.nack(false);
          }

          return result;
        },
        3
      ),
      retry({
        count: 2,
        delay: 3000,
      })
    )
    .subscribe({
      error: err => console.error('[WeiboDetailConsumer] 异常:', err),
      complete: () => console.log('[WeiboDetailConsumer] 已关闭'),
    });

  return {
    subscription,
    stop: () => subscription.unsubscribe(),
  };
}
