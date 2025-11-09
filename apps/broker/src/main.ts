import { config } from 'dotenv';
config();
import 'reflect-metadata';
import { WeiboAjaxFeedHotTimelineAst } from '@sker/workflow-ast'
import { WorkflowGraphAst } from '@sker/workflow';
import { useQueue } from '@sker/mq';
/**
 * Broker应用主入口
 *
 * 存在即合理：
 * - 统一的应用启动入口
 * - 优雅的错误处理和日志
 * - 清晰的启动过程
 */
async function bootstrap() {
  while (true) {
    const graphql = new WorkflowGraphAst()
    const hottimeline = new WeiboAjaxFeedHotTimelineAst()
    graphql.addNode(hottimeline)
    const mq = useQueue(`workflow`)
    mq.producer.next(graphql)
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.random() * 5))
  }
}

bootstrap().catch(error => {
  console.error('❌ Broker应用启动失败:', error);
  process.exit(1);
});