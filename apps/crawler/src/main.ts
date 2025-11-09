import 'dotenv/config';
import 'reflect-metadata';
import "@sker/workflow-ast";
import "@sker/workflow-run";
import { useQueue } from '@sker/mq'
import { from, switchMap, tap } from 'rxjs';
import { executeAst, WorkflowGraphAst } from '@sker/workflow';
import { root } from '@sker/core';
import { entitiesProviders } from '@sker/entities';
import { WeiboAccountService, WeiboLoginSuccessMessage } from '@sker/workflow-run';
async function bootstrap() {
  console.log('[Crawler] 启动爬虫服务...');

  root.set([...entitiesProviders]);
  await root.init();

  const accountService = root.get(WeiboAccountService);

  // 登录成功事件
  const weiboLoginSuccess = useQueue<WeiboLoginSuccessMessage>(`weibo_login_success`)
  weiboLoginSuccess.consumer$.pipe(
    switchMap(envelope => {
      const message = envelope.message;
      const handle = async () => {
        try {
          const account = await accountService.saveOrUpdateAccount(message);
          if (account) {
            console.log(`[Crawler] 账号已保存: ${account.weiboNickname} (${account.weiboUid})`);
          } else {
            console.warn(`[Crawler] 账号保存失败: 无效消息`);
          }
          envelope.ack();
        } catch (error) {
          console.error(`[Crawler] 账号保存异常:`, error);
          envelope.nack();
        }
      };
      return from(handle());
    })
  ).subscribe()
  const workflow = useQueue<WorkflowGraphAst>(`workflow`)
  const sub = workflow.consumer$.pipe(
    tap(msg => {
      const message = msg.message
      console.log(`[Crawler] ${message.name}:${message.id}`)
    }),
    switchMap(msg => {
      const message = msg.message
      const execute = async () => {
        try {
          const result: WorkflowGraphAst = await executeAst(message, {})
          if (result.state === 'success') {
            return;
          }
          if (result.state === 'fail') {
            return;
          }
          workflow.producer.next(result)
          msg.ack()
        } catch (e) {
          msg.nack()
        }
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
