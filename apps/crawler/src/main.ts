import 'dotenv/config';
import 'reflect-metadata';
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";
import { useQueue } from '@sker/mq'
import { from, switchMap, tap } from 'rxjs';
import { execute, executeAst, fromJson, WorkflowGraphAst } from '@sker/workflow';
import { root } from '@sker/core';
import { entitiesProviders } from '@sker/entities';
import { WeiboAccountService, WeiboLoginSuccessMessage, createWeiboKeywordSearchGraphAst } from '@sker/workflow-run';
async function bootstrap() {
  console.log('[Crawler] 启动爬虫服务...');

  root.set([...entitiesProviders]);
  await root.init();

  const accountService = root.get(WeiboAccountService);

  // 登录成功事件
  const weiboLoginSuccess = useQueue<{ body: WeiboLoginSuccessMessage }>(`weibo_login_success`)
  const weiboLogin$ = weiboLoginSuccess.consumer$.pipe(
    switchMap(envelope => {
      const message = envelope.message;
      const handle = async () => {
        try {
          const account = await accountService.saveOrUpdateAccount(message.body);
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
  // workflow 爬取过程 每次只执行一个步骤
  // const workflow = useQueue<WorkflowGraphAst>(`workflow`)
  // const workflow$ = workflow.consumer$.pipe(
  //   tap(msg => {
  //     const message = msg.message
  //     console.log(`[Crawler] ${message.name}:${message.id}`)
  //   }),
  //   switchMap(msg => {
  //     const message = msg.message
  //     const executeOnce = async () => {
  //       try {
  //         const ast = fromJson(message)
  //         const result: WorkflowGraphAst = await execute(ast, {})
  //         if (result.state === 'success') {
  //           console.log(`[Crawler] 工作流执行成功: ${message.name}:${message.id}`)
  //           msg.ack()
  //           return result;
  //         }
  //         if (result.state === 'fail') {
  //           console.warn(`[Crawler] 工作流执行失败: ${message.name}:${message.id}`)
  //           msg.ack()
  //           return result;
  //         }
  //         console.log(`[Crawler] 工作流继续执行: ${message.name}:${message.id}`, result)
  //         msg.ack()
  //         return result;
  //       } catch (e) {
  //         console.error(`[Crawler] 工作流执行异常: ${message.name}:${message.id}`, e)
  //         const error = (e as Error).message
  //         if (error.includes(`workflow node type`)) {
  //           msg.ack()
  //           return;
  //         }
  //         msg.nack()
  //       }
  //     }
  //     return from(executeOnce().then(res=>{
  //       console.log(res)
  //       return res;
  //     }))
  //   })
  // ).subscribe()
  // const startDate = new Date(`2025-11-08 00:00:00`)
  // workflow.producer.next(createWeiboKeywordSearchGraphAst(`江浙沪3000元人情的婚礼`, startDate))
  // 微博账号
  process.on('SIGTERM', () => {
    weiboLogin$.unsubscribe()
    // workflow$.unsubscribe()
    process.exit(0);
  });

  process.on('SIGINT', () => {
    weiboLogin$.unsubscribe()
    // workflow$.unsubscribe()
    process.exit(0);
  });
}

bootstrap().catch(console.error);
