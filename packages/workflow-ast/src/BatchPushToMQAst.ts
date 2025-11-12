import { Ast, Input, Node, Output } from "@sker/workflow";

/**
 * 批量推送模式
 *
 * n8n 风格的执行模式：
 * - ALL_AT_ONCE: Execute Once（批量处理所有 items）
 * - ONE_BY_ONE: Execute for Each Item（逐个处理每个 item）
 */
export enum BatchPushMode {
    /** 批量推送：一次性将所有 items 推送到 MQ */
    ALL_AT_ONCE = 'all_at_once',

    /** 逐个推送：为每个 item 单独推送到 MQ */
    ONE_BY_ONE = 'one_by_one',
}

/**
 * 批量推送到 MQ 节点
 *
 * 设计理念：
 * - 参考 n8n 的 Item-based 数据流设计
 * - 将 MQ 推送逻辑从业务节点中分离，符合单一职责原则
 * - 支持批量和逐个两种推送模式
 * - 通过工厂函数动态创建子工作流实例
 *
 * 使用场景：
 * 1. 将搜索结果列表分发到 MQ 进行异步处理
 * 2. 批量任务分发与限流控制
 * 3. 解耦同步工作流和异步处理
 */
@Node({ title: '批量推送到MQ' })
export class BatchPushToMQAst extends Ast {
    /** 输入：待推送的数据项列表 */
    @Input({ title: '数据项列表' })
    items: any[] = [];

    /** 输入：目标队列名称 */
    @Input({ title: '队列名称' })
    queueName: string = 'workflow';

    /** 输入：推送模式（批量 or 逐个） */
    @Input({ title: '推送模式' })
    mode: BatchPushMode = BatchPushMode.ALL_AT_ONCE;

    /** 输入：工作流工厂函数名（用于创建子工作流实例） */
    @Input({ title: '工作流工厂函数' })
    workflowFactoryName: string = 'createWeiboDetailGraphAst';

    /** 输出：成功推送的数量 */
    @Output({ title: '推送成功数量' })
    pushedCount: number = 0;

    /** 输出：推送的项（用于下游节点继续处理） */
    @Output({ title: '推送的项' })
    pushedItems: any[] = [];

    type: 'BatchPushToMQAst' = 'BatchPushToMQAst';
}
