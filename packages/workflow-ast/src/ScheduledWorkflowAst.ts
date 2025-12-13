import { Ast, Input, Output, Node, State } from '@sker/workflow'

/**
 * 定时工作流节点
 *
 * 存在即合理：
 * - 将工作流调度能力抽象为 AST 节点
 * - 支持 Cron、间隔、一次性三种调度类型
 * - 可在工作流画布中拖拽使用
 *
 * 优雅设计：
 * - 输入参数直接映射到 WorkflowScheduleEntity
 * - 输出调度ID和下次执行时间，便于追踪
 * - 支持启用/禁用控制
 */
@Node({
  title: '定时工作流',
  type: 'scheduler',
  errorStrategy: 'skip'
})
export class ScheduledWorkflowAst extends Ast {
  @Input({ title: '工作流名称', type: 'text' })
  workflowName: string = ''

  @Input({ title: '调度名称', type: 'text' })
  scheduleName: string = ''

  @Input({ title: '调度类型', type: 'select' })
  scheduleType: 'cron' | 'interval' | 'once' = 'cron'

  @Input({ title: 'Cron 表达式', type: 'text' })
  cronExpression?: string = '0 * * * *'

  @Input({ title: '间隔秒数', type: 'number' })
  intervalSeconds?: number = 3600

  @Input({ title: '开始时间', type: 'date' })
  startTime?: Date

  @Input({ title: '结束时间', type: 'date' })
  endTime?: Date

  @Input({ title: '输入参数（JSON）', type: 'text' })
  inputs?: string = '{}'

  @Input({ title: '是否启用', type: 'boolean' })
  enabled: boolean = true

  @Output({ title: '调度ID' })
  scheduleId: string = ''

  @Output({ title: '下次执行时间' })
  nextRunAt?: Date

  @State({ title: '状态' })
  status: string = 'enabled'

  type: 'ScheduledWorkflowAst' = 'ScheduledWorkflowAst'
}
