import { Ast } from "./ast";
import { Input, Node, Output } from "./decorator";

/**
 * 消息队列推送节点
 *
 * 用途：将数据推送到消息队列
 * 场景：
 * - 异步任务分发
 * - 解耦生产者消费者
 * - 流量削峰填谷
 * - 跨工作流通信
 */
@Node({ title: '推送消息', type: 'basic' })
export class MqPushAst extends Ast {
    type: `MqPushAst` = `MqPushAst`

    @Input({ title: '队列名称' })
    queueName: string = ``

    @Input({ title: '消息内容' })
    input: any = ``

    @Output({ title: '推送结果' })
    success: boolean = false
}

/**
 * 消息队列拉取节点
 *
 * 用途：从消息队列拉取数据
 * 场景：
 * - 消费异步任务
 * - 批量数据处理
 * - 事件驱动流程
 * - 跨工作流数据接收
 */
@Node({ title: '拉取消息', type: 'basic' })
export class MqPullAst extends Ast {
    type: `MqPullAst` = `MqPullAst`

    @Input({ title: '队列名称' })
    queueName: string = ``

    @Input({ title: '最多拉取次数', defaultValue: 10 })
    max: number = 10

    @Output({ title: '消息内容' })
    output: any = ``
}

