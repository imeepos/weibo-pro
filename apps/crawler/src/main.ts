import { config } from 'dotenv';
config();
import 'reflect-metadata';
import "@sker/workflow-ast";
import "@sker/workflow-run";
import { useQueue } from '@sker/mq'
import { from, switchMap, tap } from 'rxjs';
import { executeAst, WorkflowGraphAst } from '@sker/workflow';
async function bootstrap() {
  console.log('[Crawler] 启动爬虫服务...');
  const mq = useQueue<WorkflowGraphAst>(`workflow`)
  const sub = mq.consumer$.pipe(
    tap(msg => {
      const message = msg.message
      console.log(`[Crawler] ${message.name}:${message.id}`)
    }),
    switchMap(msg => {
      msg.ack()
      const message = msg.message
      const execute = async () => {
        const result: WorkflowGraphAst = await executeAst(message, {})
        if (result.state === 'success') {
          return;
        }
        if (result.state === 'fail') {
          return;
        }
        mq.producer.next(result)
      }
      return from(execute())
    })
  ).subscribe()

  process.on('SIGTERM', () => {
    sub.unsubscribe()
    process.exit(0);
  });

  process.on('SIGINT', () => {
    sub.unsubscribe()
    process.exit(0);
  });
}

bootstrap().catch(console.error);
