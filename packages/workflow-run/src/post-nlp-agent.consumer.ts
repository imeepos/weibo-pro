import { mergeMap, retry, tap } from 'rxjs';
import { root } from '@sker/core';
import { execute } from '@sker/workflow';
import { useQueue } from '@sker/mq';
import {
  PostContextCollectorAst,
  PostNLPAnalyzerAst,
  EventAutoCreatorAst,
} from '@sker/workflow-ast';
import { PostContextCollectorVisitor } from './PostContextCollectorVisitor';
import { PostNLPAnalyzerVisitor } from './PostNLPAnalyzerVisitor';
import { EventAutoCreatorVisitor } from './EventAutoCreatorVisitor';

export interface PostNLPTask {
  postId: string;
}

root.set([
  { provide: PostContextCollectorVisitor, useClass: PostContextCollectorVisitor },
  { provide: PostNLPAnalyzerVisitor, useClass: PostNLPAnalyzerVisitor },
  { provide: EventAutoCreatorVisitor, useClass: EventAutoCreatorVisitor },
]);

export function startPostNLPConsumer() {
  const queue = useQueue<PostNLPTask>('post_nlp_queue');

  console.log('[PostNLPAgent] 消费者启动中...');
  console.log(`[PostNLPAgent] 队列: ${queue.queueName}`);
  console.log(`[PostNLPAgent] 死信队列: ${queue.dlqName}`);

  const subscription = queue.consumer$
    .pipe(
      tap((envelope: any) => {
        console.log(`[PostNLPAgent] 接收任务: postId=${envelope.message.postId}`);
      }),
      mergeMap(
        async (envelope: any) => {
          const { postId } = envelope.message;

          const collectorAst = new PostContextCollectorAst();
          collectorAst.postId = postId;

          const analyzerAst = new PostNLPAnalyzerAst();
          const creatorAst = new EventAutoCreatorAst();

          const workflow = {
            nodes: [collectorAst, analyzerAst, creatorAst],
            edges: [
              {
                from: collectorAst.id,
                fromProperty: 'post',
                to: analyzerAst.id,
                toProperty: 'post',
              },
              {
                from: collectorAst.id,
                fromProperty: 'comments',
                to: analyzerAst.id,
                toProperty: 'comments',
              },
              {
                from: collectorAst.id,
                fromProperty: 'reposts',
                to: analyzerAst.id,
                toProperty: 'reposts',
              },
              {
                from: analyzerAst.id,
                fromProperty: 'nlpResult',
                to: creatorAst.id,
                toProperty: 'nlpResult',
              },
              {
                from: collectorAst.id,
                fromProperty: 'post',
                to: creatorAst.id,
                toProperty: 'post',
              },
            ],
          };

          const result = await execute(workflow as any, {});

          if (creatorAst.state === 'success') {
            console.log(
              `[PostNLPAgent] 处理成功: postId=${postId}, eventId=${creatorAst.event.id}, nlpResultId=${creatorAst.nlpResultId}`
            );
            envelope.ack();
          } else {
            console.error(
              `[PostNLPAgent] 处理失败: postId=${postId}`,
              creatorAst.error
            );
            envelope.nack(false);
          }

          return result;
        },
        3
      ),
      retry({
        count: 2,
        delay: 5000,
      })
    )
    .subscribe({
      next: () => {},
      error: (err: any) => {
        console.error('[PostNLPAgent] 消费者异常:', err);
      },
      complete: () => {
        console.log('[PostNLPAgent] 消费者已关闭');
      },
    });

  return {
    subscription,
    stop: () => {
      console.log('[PostNLPAgent] 停止消费者...');
      subscription.unsubscribe();
    },
  };
}
