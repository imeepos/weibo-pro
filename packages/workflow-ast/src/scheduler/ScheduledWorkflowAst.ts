import { Ast, Input, Output, Node, State } from '@sker/workflow'

/**
 * 定时工作流节点
 *
 * 存在即合理：
 * - 将工作流调度能力抽象为 AST 节点
 * - 支持 Cron、间隔、一次性、持续四种调度类型
 * - 可在工作流画布中拖拽使用
 *
 * 优雅设计：
 * - 输入参数直接映射到 WorkflowScheduleEntity
 * - 输出调度ID和下次执行时间，便于追踪
 * - 支持启用/禁用控制
 *
 * 调度类型说明：
 * - cron: 使用 Cron 表达式定时执行
 * - interval: 按固定间隔执行（秒）
 * - once: 在指定时间执行一次
 * - continuous: 执行完毕后立即重新执行（持续循环）
 */
@Node({
  title: '定时工作流',
  type: 'scheduler',
  errorStrategy: 'skip'
})
export class ScheduledWorkflowAst extends Ast {
  @Input({ title: '工作流名称', type: 'text', defaultValue: '' })
  workflowName: string = ''

  @Input({ title: '调度名称', type: 'text', defaultValue: '' })
  scheduleName: string = ''

  @Input({ title: '调度类型', type: 'select', defaultValue: 'cron' })
  scheduleType: 'cron' | 'interval' | 'once' | 'continuous' = 'cron'

  @Input({ title: 'Cron 表达式', type: 'text', defaultValue: '0 * * * *' })
  cronExpression?: string = '0 * * * *'

  @Input({ title: '间隔秒数', type: 'number', defaultValue: 3600 })
  intervalSeconds?: number = 3600

  @Input({ title: '开始时间', type: 'date', defaultValue: null })
  startTime?: Date

  @Input({ title: '结束时间', type: 'date', defaultValue: null })
  endTime?: Date

  @Input({ title: '输入参数（JSON）', type: 'text', defaultValue: '{}' })
  inputs?: string = '{}'

  @Input({ title: '是否启用', type: 'boolean', defaultValue: true })
  enabled: boolean = true

  @Output({ title: '调度ID', defaultValue: '' })
  scheduleId = ``

  @Output({ title: '下次执行时间', defaultValue: '' })
  nextRunAt: Date | string | undefined = ``

  @State({ title: '状态' })
  status: string = 'enabled'

  type: 'ScheduledWorkflowAst' = 'ScheduledWorkflowAst'
}
