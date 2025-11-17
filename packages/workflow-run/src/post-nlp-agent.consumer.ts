import { mergeMap, retry, tap } from 'rxjs';
import { root } from '@sker/core';
import { execute, createWorkflowGraphAst, generateId } from '@sker/workflow';
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

          try {
            const collectorAst = new PostContextCollectorAst();
            collectorAst.postId = postId;

            const analyzerAst = new PostNLPAnalyzerAst();
            const creatorAst = new EventAutoCreatorAst();

            const workflow = createWorkflowGraphAst({
              name: 'PostNLPWorkflow',
              nodes: [collectorAst, analyzerAst, creatorAst],
              edges: [
                {
                  id: generateId(),
                  type: 'data' as const,
                  from: collectorAst.id,
                  fromProperty: 'post',
                  to: analyzerAst.id,
                  toProperty: 'post',
                },
                {
                  id: generateId(),
                  type: 'data' as const,
                  from: collectorAst.id,
                  fromProperty: 'comments',
                  to: analyzerAst.id,
                  toProperty: 'comments',
                },
                {
                  id: generateId(),
                  type: 'data' as const,
                  from: collectorAst.id,
                  fromProperty: 'reposts',
                  to: analyzerAst.id,
                  toProperty: 'reposts',
                },
                {
                  id: generateId(),
                  type: 'data' as const,
                  from: analyzerAst.id,
                  fromProperty: 'nlpResult',
                  to: creatorAst.id,
                  toProperty: 'nlpResult',
                },
                {
                  id: generateId(),
                  type: 'data' as const,
                  from: collectorAst.id,
                  fromProperty: 'post',
                  to: creatorAst.id,
                  toProperty: 'post',
                },
              ],
            });

            const result = await execute(workflow, {});

            // 从执行结果中获取更新后的节点状态
            const executedCollector = result.nodes.find((n: any) => n.id === collectorAst.id);
            const executedAnalyzer = result.nodes.find((n: any) => n.id === analyzerAst.id);
            const executedCreator = result.nodes.find((n: any) => n.id === creatorAst.id);

            console.log(`[PostNLPAgent] 工作流执行完成，检查状态:`);
            console.log(`  - PostContextCollector: ${executedCollector?.state}`, executedCollector?.error?.message || '');
            console.log(`  - PostNLPAnalyzer: ${executedAnalyzer?.state}`, executedAnalyzer?.error?.message || '');
            console.log(`  - EventAutoCreator: ${executedCreator?.state}`, executedCreator?.error?.message || '');

            if (executedCreator?.state === 'success') {
              console.log(
                `[PostNLPAgent] 处理成功: postId=${postId}, eventId=${executedCreator.event.id}, nlpResultId=${executedCreator.nlpResultId}`
              );
              envelope.ack();
            } else {
              console.error(
                `[PostNLPAgent] 处理失败: postId=${postId}`,
                {
                  collectorError: executedCollector?.error,
                  analyzerError: executedAnalyzer?.error,
                  creatorError: executedCreator?.error,
                }
              );
              envelope.nack(false);
            }

            return result;
          } catch (error: any) {
            console.error(
              `[PostNLPAgent] 工作流执行异常: postId=${postId}`,
              {
                error: error.message,
                type: error.type,
                stack: error.stack,
              }
            );
            envelope.nack(false);
            return null;
          }
        },
        3
      )
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
