import nodeSchedule from 'node-schedule'

/**
 * Cron 调度任务注册表
 *
 * 统一管理内存中的调度状态：
 * - scheduleJobs: node-schedule 的 Job 对象（CRON / ONCE 类型）
 * - intervalTimers: setInterval 定时器（INTERVAL 类型）
 * - continuousRunning: 持续调度运行标记（CONTINUOUS 类型）
 * - accountSyncJob: 账号同步定时任务
 */
export class CronJobRegistry {
  readonly scheduleJobs = new Map<string, nodeSchedule.Job>()
  readonly intervalTimers = new Map<string, NodeJS.Timeout>()
  readonly continuousRunning = new Set<string>()
  private accountSyncJob: nodeSchedule.Job | null = null

  getJob(scheduleId: string): nodeSchedule.Job | undefined {
    return this.scheduleJobs.get(scheduleId)
  }

  setJob(scheduleId: string, job: nodeSchedule.Job): void {
    this.scheduleJobs.set(scheduleId, job)
  }

  cancelJob(scheduleId: string): boolean {
    const job = this.scheduleJobs.get(scheduleId)
    if (!job) return false
    job.cancel()
    this.scheduleJobs.delete(scheduleId)
    return true
  }

  getTimer(scheduleId: string): NodeJS.Timeout | undefined {
    return this.intervalTimers.get(scheduleId)
  }

  setTimer(scheduleId: string, timer: NodeJS.Timeout): void {
    this.intervalTimers.set(scheduleId, timer)
  }

  cancelTimer(scheduleId: string): boolean {
    const timer = this.intervalTimers.get(scheduleId)
    if (!timer) return false
    clearInterval(timer)
    this.intervalTimers.delete(scheduleId)
    return true
  }

  hasContinuous(scheduleId: string): boolean {
    return this.continuousRunning.has(scheduleId)
  }

  addContinuous(scheduleId: string): void {
    this.continuousRunning.add(scheduleId)
  }

  deleteContinuous(scheduleId: string): boolean {
    return this.continuousRunning.delete(scheduleId)
  }

  getAccountSyncJob(): nodeSchedule.Job | null {
    return this.accountSyncJob
  }

  setAccountSyncJob(job: nodeSchedule.Job | null): void {
    this.accountSyncJob = job
  }

  cancelAccountSyncJob(): void {
    if (this.accountSyncJob) {
      this.accountSyncJob.cancel()
      this.accountSyncJob = null
    }
  }

  getJobCount(): number {
    return this.scheduleJobs.size + this.intervalTimers.size + this.continuousRunning.size
  }

  getScheduleIds(): string[] {
    return Array.from(new Set([...this.scheduleJobs.keys(), ...this.intervalTimers.keys(), ...this.continuousRunning]))
  }
}
