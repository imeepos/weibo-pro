import { Injectable, Inject } from '@sker/core'
import { DataSource, Repository } from '@sker/entities'
import { WorkflowScheduleEntity, ScheduleType, ScheduleStatus } from '@sker/entities'
import { WorkflowRunService } from './workflow-run.service'
import { CronExpressionParser } from 'cron-parser'

export interface CreateScheduleDto {
  workflowName: string
  name: string
  scheduleType: ScheduleType
  cronExpression?: string
  intervalSeconds?: number
  inputs: Record<string, unknown>
  startTime?: Date
  endTime?: Date
}

export interface UpdateScheduleDto {
  name?: string
  scheduleType?: ScheduleType
  cronExpression?: string
  intervalSeconds?: number
  inputs?: Record<string, unknown>
  startTime?: Date
  endTime?: Date
  status?: ScheduleStatus
  nextRunAt?: Date | null
}

@Injectable()
export class WorkflowScheduleService {
  private scheduleRepository: Repository<WorkflowScheduleEntity>

  constructor(
    @Inject(DataSource) private dataSource: DataSource,
    @Inject(WorkflowRunService) private workflowRunService: WorkflowRunService
  ) {
    this.scheduleRepository = this.dataSource.getRepository(WorkflowScheduleEntity)
  }

  async createSchedule(dto: CreateScheduleDto): Promise<WorkflowScheduleEntity> {
    // 通过工作流名称查询工作流ID
    const workflowRepo = this.dataSource.getRepository('WorkflowEntity')
    const workflow = await workflowRepo.findOne({
      where: { code: dto.workflowName }
    })

    if (!workflow) {
      throw new Error(`Workflow ${dto.workflowName} not found`)
    }

    const workflowId = (workflow as any).id

    // 验证调度参数
    this.validateSchedule(dto)

    // 计算下次执行时间
    const nextRunAt = this.calculateNextRunTime(dto.scheduleType, {
      cronExpression: dto.cronExpression,
      intervalSeconds: dto.intervalSeconds,
      startTime: dto.startTime
    })

    const schedule = this.scheduleRepository.create({
      workflowId,
      name: dto.name,
      scheduleType: dto.scheduleType,
      cronExpression: dto.cronExpression,
      intervalSeconds: dto.intervalSeconds,
      inputs: dto.inputs,
      startTime: dto.startTime || new Date(),
      endTime: dto.endTime,
      nextRunAt: nextRunAt ?? undefined,
      status: ScheduleStatus.ENABLED
    })

    return this.scheduleRepository.save(schedule)
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto): Promise<WorkflowScheduleEntity> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } })
    if (!schedule) {
      throw new Error(`Schedule ${id} not found`)
    }

    // 如果修改了调度参数，重新计算下次执行时间
    if (dto.scheduleType || dto.cronExpression || dto.intervalSeconds || dto.startTime) {
      const scheduleType = dto.scheduleType || schedule.scheduleType
      const cronExpression = dto.cronExpression || schedule.cronExpression
      const intervalSeconds = dto.intervalSeconds || schedule.intervalSeconds
      const startTime = dto.startTime || schedule.startTime

      // 通过工作流ID查询工作流名称
      const workflowRepo = this.dataSource.getRepository('WorkflowEntity')
      const workflow = await workflowRepo.findOne({
        where: { id: schedule.workflowId }
      })

      if (!workflow) {
        throw new Error(`Workflow with ID ${schedule.workflowId} not found`)
      }

      this.validateSchedule({
        workflowName: (workflow as any).code,
        name: dto.name || schedule.name,
        scheduleType,
        cronExpression,
        intervalSeconds,
        inputs: dto.inputs || schedule.inputs,
        startTime,
        endTime: dto.endTime || schedule.endTime
      })

      dto.nextRunAt = this.calculateNextRunTime(scheduleType, {
        cronExpression,
        intervalSeconds,
        startTime
      })
    }

    Object.assign(schedule, dto)
    return this.scheduleRepository.save(schedule)
  }

  async deleteSchedule(id: string): Promise<void> {
    const result = await this.scheduleRepository.softDelete(id)
    if (result.affected === 0) {
      throw new Error(`Schedule ${id} not found`)
    }
  }

  async getSchedule(id: string): Promise<WorkflowScheduleEntity> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id }
    })
    if (!schedule) {
      throw new Error(`Schedule ${id} not found`)
    }
    return schedule
  }

  async listSchedules(workflowName?: string): Promise<WorkflowScheduleEntity[]> {
    if (workflowName) {
      // 通过工作流名称查询
      const workflowRepo = this.dataSource.getRepository('WorkflowEntity')
      const workflow = await workflowRepo.findOne({
        where: { code: workflowName }
      })
      if (!workflow) {
        return []
      }
      return this.scheduleRepository.find({
        where: { workflowId: (workflow as any).id },
        order: { createdAt: 'DESC' }
      })
    }
    // 查询所有
    return this.scheduleRepository.find({
      order: { createdAt: 'DESC' }
    })
  }

  async enableSchedule(id: string): Promise<WorkflowScheduleEntity> {
    const schedule = await this.getSchedule(id)
    if (schedule.status === ScheduleStatus.ENABLED) {
      return schedule
    }

    // 重新计算下次执行时间
    const nextRunAt = this.calculateNextRunTime(schedule.scheduleType, {
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
    return this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.status = :status', { status: ScheduleStatus.ENABLED })
      .andWhere('schedule.nextRunAt <= :now', { now: new Date() })
      .orderBy('schedule.nextRunAt', 'ASC')
      .take(limit)
      .getMany()
  }

  async updateScheduleAfterRun(schedule: WorkflowScheduleEntity): Promise<void> {
    const now = new Date()
    const nextRunAt = this.calculateNextRunTime(schedule.scheduleType, {
      cronExpression: schedule.cronExpression,
      intervalSeconds: schedule.intervalSeconds,
      startTime: now
    })

    // 检查是否过期
    let status = schedule.status
    if (schedule.endTime && nextRunAt && nextRunAt > schedule.endTime) {
      status = ScheduleStatus.EXPIRED
    }

    await this.scheduleRepository.update(schedule.id, {
      lastRunAt: now,
      nextRunAt: status === ScheduleStatus.EXPIRED ? undefined : nextRunAt ?? undefined,
      status
    })
  }

  async updateLastRunTime(scheduleId: string): Promise<void> {
    await this.scheduleRepository.update(scheduleId, {
      lastRunAt: new Date()
    })
  }

  private validateSchedule(dto: CreateScheduleDto): void {
    switch (dto.scheduleType) {
      case ScheduleType.CRON:
        if (!dto.cronExpression) {
          throw new Error('Cron expression is required for cron schedule')
        }
        try {
          CronExpressionParser.parse(dto.cronExpression)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          throw new Error(`Invalid cron expression: ${errorMessage}`)
        }
        break
      case ScheduleType.INTERVAL:
        if (!dto.intervalSeconds || dto.intervalSeconds <= 0) {
          throw new Error('Interval seconds must be greater than 0')
        }
        break
      case ScheduleType.ONCE:
        if (!dto.startTime) {
          throw new Error('Start time is required for one-time schedule')
        }
        break
    }

    if (dto.endTime && dto.startTime && dto.endTime <= dto.startTime) {
      throw new Error('End time must be after start time')
    }
  }

  calculateNextRunTime(
    scheduleType: ScheduleType,
    params: {
      cronExpression?: string
      intervalSeconds?: number
      startTime?: Date
    }
  ): Date | null {
    const now = new Date()
    const startTime = params.startTime || now

    switch (scheduleType) {
      case ScheduleType.ONCE:
        return startTime > now ? startTime : now
      case ScheduleType.CRON:
        if (!params.cronExpression) {
          throw new Error('Cron expression required')
        }
        try {
          const interval = CronExpressionParser.parse(params.cronExpression)
          const next = interval.next()
          return next.toDate()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          throw new Error(`Failed to calculate next run time: ${errorMessage}`)
        }
      case ScheduleType.INTERVAL:
        if (!params.intervalSeconds) {
          throw new Error('Interval seconds required')
        }
        return new Date(now.getTime() + params.intervalSeconds * 1000)
      case ScheduleType.MANUAL:
        // 手动触发不需要下次执行时间
        return null
      default:
        throw new Error(`Unsupported schedule type: ${scheduleType}`)
    }
  }
}