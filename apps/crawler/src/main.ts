import { config } from 'dotenv';
import { join } from 'path';

// 加载项目根目录的 .env 文件
config({ path: join(__dirname, '../../../.env') });
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
      const res = from(execute().then(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.random() * 5))
        msg.ack()
      }))
      return res;
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
