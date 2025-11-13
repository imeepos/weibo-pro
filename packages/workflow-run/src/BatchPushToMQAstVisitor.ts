import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { BatchPushToMQAst, BatchPushMode } from '@sker/workflow-ast';
import { useQueue } from '@sker/mq';

/**
 * 工作流工厂函数注册表
 *
 * 优雅设计：
 * - 通过函数名字符串动态选择工厂
 * - 避免循环依赖和硬编码
 * - 可扩展：新增工厂函数无需修改核心逻辑
 */
const workflowFactories: Record<string, (item: any) => any> = {};

/**
 * 注册工作流工厂函数
 *
 * 使用示例：
 * ```typescript
 * registerWorkflowFactory('createWeiboDetailGraphAst', (item) => {
 *   return createWeiboDetailGraphAst(item.mblogid, item.uid);
 * });
 * ```
 */
export function registerWorkflowFactory(name: string, factory: (item: any) => any) {
    workflowFactories[name] = factory;
    console.log(`[BatchPushToMQAst] 注册工作流工厂: ${name}`);
}

/**
 * 获取已注册的工厂函数列表
 */
export function getRegisteredFactories(): string[] {
    return Object.keys(workflowFactories);
}

/**
 * 批量推送到 MQ 节点执行器
 *
 * n8n 设计理念：
 * - Execute Once (ALL_AT_ONCE)：批量处理所有 items
 * - Execute for Each Item (ONE_BY_ONE)：逐个处理每个 item
 *
 * 职责：
 * - 接收上游节点的 items 数组
 * - 根据模式选择推送策略
 * - 通过工厂函数创建子工作流实例
 * - 将子工作流推送到 MQ 队列
 */
@Injectable()
export class BatchPushToMQAstVisitor {
    @Handler(BatchPushToMQAst)
    async visit(ast: BatchPushToMQAst, _ctx: any): Promise<BatchPushToMQAst> {
        ast.state = 'running';

        const { items, queueName, mode, workflowFactoryName } = ast;

        // 空数组直接返回成功
        if (!items || items.length === 0) {
            ast.state = 'success';
            ast.pushedCount = 0;
            ast.pushedItems = [];
            console.log(`[BatchPushToMQAst] 输入为空，跳过推送`);
            return ast;
        }

        // 获取工厂函数
        const factory = workflowFactories[workflowFactoryName];
        if (!factory) {
            ast.state = 'fail';
            ast.error = new Error(
                `工作流工厂函数 "${workflowFactoryName}" 未注册。请使用 registerWorkflowFactory() 注册。`
            );
            console.error(`[BatchPushToMQAst] ${ast.error.message}`);
            console.error(`[BatchPushToMQAst] 可用的工厂函数: ${Object.keys(workflowFactories).join(', ') || '(无)'}`);
            return ast;
        }

        const queue = useQueue(queueName);

        try {
            if (mode === BatchPushMode.ALL_AT_ONCE) {
                // n8n Execute Once 模式：批量推送
                console.log(`[BatchPushToMQAst] 批量推送模式，共 ${items.length} 个 items 到队列 "${queueName}"`);

                const workflows = items.map(item => {
                    try {
                        return factory(item);
                    } catch (error) {
                        console.error(`[BatchPushToMQAst] 工厂函数执行失败:`, item, error);
                        throw error;
                    }
                });

                // 使用 nextBatch 方法批量推送
                await queue.producer.nextBatch(workflows);
                ast.pushedCount = items.length;

                console.log(`[BatchPushToMQAst] 批量推送成功: ${ast.pushedCount} 个任务`);
            } else {
                // n8n Execute for Each Item 模式：逐个推送
                console.log(`[BatchPushToMQAst] 逐个推送模式，共 ${items.length} 个 items 到队列 "${queueName}"`);

                let successCount = 0;
                for (const item of items) {
                    try {
                        const workflow = factory(item);
                        await queue.producer.next(workflow);
                        successCount++;
                    } catch (error) {
                        console.error(`[BatchPushToMQAst] 推送失败:`, item, error);
                        // 继续推送剩余 items（容错处理）
                    }
                }

                ast.pushedCount = successCount;
                console.log(`[BatchPushToMQAst] 逐个推送完成: ${successCount}/${items.length} 成功`);
            }

            // 将推送的 items 传递给下游节点
            ast.pushedItems = items;
            ast.state = 'success';
        } catch (error) {
            ast.state = 'fail';
            ast.error = error instanceof Error ? error : new Error(String(error));
            console.error(`[BatchPushToMQAst] 推送失败:`, error);
        }

        return ast;
    }
}

// 注册默认的工作流工厂函数
// 延迟导入避免循环依赖
registerWorkflowFactory('createWeiboDetailGraphAst', (item: any) => {
    const { createWeiboDetailGraphAst } = require('./createWeiboDetailGraphAst');
    return createWeiboDetailGraphAst(item.mblogid, item.uid);
});
