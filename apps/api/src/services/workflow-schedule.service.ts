import { Injectable, Inject } from '@sker/core'
import { useEntityManager } from '@sker/entities'
import { WorkflowScheduleEntity, ScheduleType, ScheduleStatus, WorkflowEntity } from '@sker/entities'
import { WorkflowRunService } from './workflow-run.service'
import { LessThanOrEqual } from 'typeorm'
import { toDate as toDateUtil, validateSchedule, calculateNextRunTime } from './workflow-schedule.utils'

export interface CreateScheduleDto {
  workflowName: string
  name: string
  scheduleType: ScheduleType
  cronExpression?: string
  intervalSeconds?: number
  inputs: Record<string, unknown>
  startTime?: Date | string  // 支持字符串或 Date
  endTime?: Date | string
}

export interface UpdateScheduleDto {
  name?: string
  scheduleType?: ScheduleType
  cronExpression?: string
  intervalSeconds?: number
  inputs?: Record<string, unknown>
  startTime?: Date | string  // 支持字符串或 Date
  endTime?: Date | string
  status?: ScheduleStatus
  nextRunAt?: Date | null
}

@Injectable()
export class WorkflowScheduleService {
  constructor(
    @Inject(WorkflowRunService) private workflowRunService: WorkflowRunService
  ) {}

  /**
   * 将字符串或 Date 对象转换为 Date
   * 如果值无效，返回 undefined 而不是 Invalid Date
   */
  private toDate(value?: Date | string): Date | undefined {
    return toDateUtil(value)
  }

  async createSchedule(dto: CreateScheduleDto): Promise<WorkflowScheduleEntity> {
    return await useEntityManager(async m => {
      // 通过工作流名称查询工作流ID
      const workflow = await m.findOne(WorkflowEntity, {
        where: { code: dto.workflowName }
      })

      if (!workflow) {
        throw new Error(`Workflow ${dto.workflowName} not found`)
      }

      const workflowId = workflow.id

      // 转换时间字符串为 Date 对象
      const startTime = this.toDate(dto.startTime)
      const endTime = this.toDate(dto.endTime)

      // 验证调度参数
      validateSchedule({
        ...dto,
        startTime,
        endTime,
      })

      // 计算下次执行时间
      const nextRunAt = calculateNextRunTime(dto.scheduleType, {
        cronExpression: dto.cronExpression,
        intervalSeconds: dto.intervalSeconds,
        startTime
      })

      const schedule = m.create(WorkflowScheduleEntity, {
        workflowId,
        name: dto.name,
        scheduleType: dto.scheduleType,
        cronExpression: dto.cronExpression,
        intervalSeconds: dto.intervalSeconds,
        inputs: dto.inputs,
        startTime: startTime || new Date(),
        endTime,
        nextRunAt: nextRunAt ?? undefined,
        status: ScheduleStatus.ENABLED
      })

      const { id } = await m.save(WorkflowScheduleEntity, schedule)
      return { ...schedule, id }
    })
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto): Promise<WorkflowScheduleEntity> {
    return await useEntityManager(async m => {
      const schedule = await m.findOne(WorkflowScheduleEntity, { where: { id } })
      if (!schedule) {
        throw new Error(`Schedule ${id} not found`)
      }

      // 转换时间字符串为 Date 对象
      const startTime = this.toDate(dto.startTime)
      const endTime = this.toDate(dto.endTime)

      // 如果修改了调度参数，重新计算下次执行时间
      if (dto.scheduleType || dto.cronExpression || dto.intervalSeconds || dto.startTime) {
        const scheduleType = dto.scheduleType || schedule.scheduleType
        const cronExpression = dto.cronExpression || schedule.cronExpression
        const intervalSeconds = dto.intervalSeconds || schedule.intervalSeconds
        const resolvedStartTime = startTime !== undefined ? startTime : schedule.startTime

        // 通过工作流ID查询工作流名称
        const workflow = await m.findOne(WorkflowEntity, {
          where: { id: schedule.workflowId }
        })

        if (!workflow) {
          throw new Error(`Workflow with ID ${schedule.workflowId} not found`)
        }

        validateSchedule({
          workflowName: workflow.code,
          name: dto.name || schedule.name,
          scheduleType,
          cronExpression,
          intervalSeconds,
          inputs: dto.inputs || schedule.inputs,
          startTime: resolvedStartTime,
          endTime: endTime !== undefined ? endTime : schedule.endTime
        })

        dto.nextRunAt = calculateNextRunTime(scheduleType, {
          cronExpression,
          intervalSeconds,
          startTime: resolvedStartTime
        })

        // 如果调度已过期但新的下次执行时间有效，重新启用
        const resolvedEndTime = endTime !== undefined ? endTime : schedule.endTime
        if (schedule.status === ScheduleStatus.EXPIRED && dto.nextRunAt) {
          if (!resolvedEndTime || dto.nextRunAt <= resolvedEndTime) {
            dto.status = ScheduleStatus.ENABLED
          }
        }
      }

      const updateData: any = {
        ...dto,
        startTime,
        endTime,
      }
      if (dto.nextRunAt === null) {
        updateData.nextRunAt = null
      }
      await m.update(WorkflowScheduleEntity, id, updateData)
      const updatedSchedule = await m.findOne(WorkflowScheduleEntity, { where: { id } })
      if (!updatedSchedule) {
        throw new Error(`Schedule ${id} not found after update`)
      }
      return updatedSchedule
    })
  }

  async deleteSchedule(id: string): Promise<void> {
    await useEntityManager(async m => {
      const result = await m.softDelete(WorkflowScheduleEntity, id)
      if (result.affected === 0) {
        throw new Error(`Schedule ${id} not found`)
      }
    })
  }

  async getSchedule(id: string): Promise<WorkflowScheduleEntity> {
    return await useEntityManager(async m => {
      const schedule = await m.findOne(WorkflowScheduleEntity, {
        where: { id }
      })
      if (!schedule) {
        throw new Error(`Schedule ${id} not found`)
      }
      return schedule
    })
  }

  async listSchedules(workflowName?: string): Promise<WorkflowScheduleEntity[]> {
    return await useEntityManager(async m => {
      if (workflowName) {
        // 通过工作流名称查询
        const workflow = await m.findOne(WorkflowEntity, {
          where: { code: workflowName }
        })
        if (!workflow) {
          return []
        }
        return m.find(WorkflowScheduleEntity, {
          where: { workflowId: workflow.id },
          order: { createdAt: 'DESC' }
        })
      }
      // 查询所有
      return m.find(WorkflowScheduleEntity, {
        order: { createdAt: 'DESC' }
      })
    })
  }

  async enableSchedule(id: string): Promise<WorkflowScheduleEntity> {
    const schedule = await this.getSchedule(id)
    if (schedule.status === ScheduleStatus.ENABLED) {
      return schedule
    }

    // 重新计算下次执行时间
    const nextRunAt = calculateNextRunTime(schedule.scheduleType, {
      cronExpression: schedule.cronExpression,
      intervalSeconds: schedule.intervalSeconds,
      startTime: new Date()
    })

    return this.updateSchedule(id, {
      status: ScheduleStatus.ENABLED,
      nextRunAt
    })
  }

  async disableSchedule(id: string): Promise<WorkflowScheduleEntity> {
    return this.updateSchedule(id, {
      status: ScheduleStatus.DISABLED,
      nextRunAt: null
    })
  }

  async getSchedulesToRun(limit = 100): Promise<WorkflowScheduleEntity[]> {
    return await useEntityManager(async m => {
      return m.find(WorkflowScheduleEntity, {
        where: {
          status: ScheduleStatus.ENABLED,
          nextRunAt: LessThanOrEqual(new Date())
        },
        order: { nextRunAt: 'ASC' },
        take: limit
      })
    })
  }

  async updateScheduleAfterRun(schedule: WorkflowScheduleEntity): Promise<void> {
    await useEntityManager(async m => {
      const now = new Date()
      const nextRunAt = calculateNextRunTime(schedule.scheduleType, {
        cronExpression: schedule.cronExpression,
        intervalSeconds: schedule.intervalSeconds,
        startTime: now
      })

      // 检查是否过期
      let status = schedule.status
      if (schedule.endTime && nextRunAt && nextRunAt > schedule.endTime) {
        status = ScheduleStatus.EXPIRED
      }

      await m.update(WorkflowScheduleEntity, schedule.id, {
        lastRunAt: now,
        nextRunAt: status === ScheduleStatus.EXPIRED ? undefined : nextRunAt ?? undefined,
        status
      })
    })
  }

  async updateLastRunTime(scheduleId: string): Promise<void> {
    await useEntityManager(async m => {
      await m.update(WorkflowScheduleEntity, scheduleId, {
        lastRunAt: new Date()
      })
    })
  }

  calculateNextRunTime(
    scheduleType: ScheduleType,
    params: {
      cronExpression?: string
      intervalSeconds?: number
      startTime?: Date
    }
  ): Date | null {
    return calculateNextRunTime(scheduleType, params)
  }
}
