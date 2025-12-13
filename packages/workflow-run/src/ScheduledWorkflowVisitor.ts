import { Inject, Injectable, logger } from '@sker/core'
import { Handler, INode, setAstError } from '@sker/workflow'
import { ScheduledWorkflowAst } from '@sker/workflow-ast'
import {
  WorkflowScheduleEntity,
  WorkflowEntity,
  ScheduleType,
  ScheduleStatus,
  useEntityManager
} from '@sker/entities'
import { CronSchedulerService } from './services/CronSchedulerService'
import { WorkflowExecutionService } from './services/WorkflowExecutionService'
import { Observable } from 'rxjs'

/**
 * ScheduledWorkflowAst 访问者
 *
 * 存在即合理：
 * - 处理工作流节点中的调度创建
 * - 将 AST 节点参数转换为 WorkflowScheduleEntity
 * - 调用 CronSchedulerService 注册调度任务
 *
 * 优雅设计：
 * - 输入：ScheduledWorkflowAst
 * - 输出：scheduleId + nextRunAt
 * - 自动启动调度（如果 enabled = true）
 */
@Injectable()
export class ScheduledWorkflowVisitor {
  constructor(
    @Inject(CronSchedulerService) private scheduler: CronSchedulerService
  ) {}

  @Handler(ScheduledWorkflowAst)
  visit(ast: ScheduledWorkflowAst, ctx: any): Observable<INode> {
    return new Observable<INode>((obs) => {
      const handler = async () => {
        try {
          ast.state = 'running'
          obs.next({ ...ast })

          // 解析输入参数
          let inputs: Record<string, unknown> = {}
          if (ast.inputs) {
            try {
              inputs = JSON.parse(ast.inputs)
            } catch (error) {
              throw new Error(`输入参数 JSON 解析失败: ${(error as Error).message}`)
            }
          }

          // 查找工作流
          const workflow = await useEntityManager(async (m) => {
            return await m.findOne(WorkflowEntity, {
              where: { code: ast.workflowName }
            })
          })

          if (!workflow) {
            throw new Error(`工作流不存在: ${ast.workflowName}`)
          }

          // 确定调度类型的参数
          const scheduleData: any = {
            workflowId: workflow.id,
            name: ast.scheduleName || `调度-${ast.workflowName}`,
            scheduleType: ast.scheduleType,
            inputs,
            startTime: ast.startTime || new Date(),
            endTime: ast.endTime,
            status: ast.enabled ? ScheduleStatus.ENABLED : ScheduleStatus.DISABLED
          }

          // 根据调度类型设置参数
          switch (ast.scheduleType) {
            case ScheduleType.CRON:
              if (!ast.cronExpression) {
                throw new Error('Cron 调度缺少 cronExpression')
              }
              scheduleData.cronExpression = ast.cronExpression
              // node-schedule 会自动计算下次执行时间
              scheduleData.nextRunAt = ast.startTime || new Date()
              break

            case ScheduleType.INTERVAL:
              if (!ast.intervalSeconds || ast.intervalSeconds <= 0) {
                throw new Error('间隔调度的 intervalSeconds 必须大于 0')
              }
              scheduleData.intervalSeconds = ast.intervalSeconds
              const startTime = ast.startTime || new Date()
              scheduleData.nextRunAt = new Date(startTime.getTime() + ast.intervalSeconds * 1000)
              break

            case ScheduleType.ONCE:
              if (!ast.startTime) {
                throw new Error('一次性调度缺少 startTime')
              }
              scheduleData.nextRunAt = ast.startTime
              break
          }

          // 创建调度
          const schedule = await useEntityManager(async (m) => {
            const entity = m.create(WorkflowScheduleEntity, scheduleData)
            return await m.save(WorkflowScheduleEntity, entity)
          })

          // 如果启用，添加到调度器
          if (ast.enabled && schedule.status === ScheduleStatus.ENABLED) {
            await this.scheduler.addSchedule(schedule)
          }

          // 设置输出
          ast.scheduleId = schedule.id
          ast.nextRunAt = schedule.nextRunAt
          ast.status = schedule.status

          ast.state = 'success'
          obs.next({ ...ast })

          logger.info('创建定时工作流成功', {
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            scheduleType: ast.scheduleType,
            enabled: ast.enabled,
            nextRunAt: schedule.nextRunAt
          })

          obs.complete()
        } catch (error) {
          logger.error('创建定时工作流失败', {
            workflowName: ast.workflowName,
            error: (error as Error).message,
            stack: (error as Error).stack
          })

          ast.state = 'fail'
          setAstError(ast, error as Error)
          obs.next({ ...ast })
          obs.complete()
        }
      }

      handler()
    })
  }
}
