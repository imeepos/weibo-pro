import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlTaskEntity } from '../entities/crawl-task.entity';
import { TaskExecutionEntity } from '../entities/task-execution.entity';
import { QueueManagerService } from './queue-manager.service';
import { SubmitTaskRequest, SubmitTaskResponse, TaskStatusResponse } from '../types/api.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 任务调度器服务
 *
 * 存在即合理：
 * - 统一的任务调度和管理
 * - 智能的任务优先级处理
 * - 完整的任务生命周期管理
 */
@Injectable()
export class TaskSchedulerService {
  constructor(
    @InjectRepository(CrawlTaskEntity)
    private readonly taskRepository: Repository<CrawlTaskEntity>,
    @InjectRepository(TaskExecutionEntity)
    private readonly executionRepository: Repository<TaskExecutionEntity>,
    private readonly queueManager: QueueManagerService,
  ) {}

  /**
   * 提交单个任务
   */
  async submitTask(request: SubmitTaskRequest): Promise<string> {
    const taskId = uuidv4();

    const task = this.taskRepository.create({
      id: taskId,
      type: request.type,
      payload: request.payload,
      priority: request.priority || 5,
      maxRetries: request.maxRetries || 3,
      retryDelay: 5000,
      status: 'pending',
      scheduledAt: request.scheduledAt ? new Date(request.scheduledAt) : new Date(),
      metadata: {},
    });

    await this.taskRepository.save(task);

    // 推送到队列
    await this.queueManager.enqueueTask(task);

    console.log(`[TaskScheduler] ✅ 任务已提交: ${taskId}, 类型: ${request.type}`);

    return taskId;
  }

  /**
   * 批量提交任务
   */
  async submitTasksBatch(requests: SubmitTaskRequest[]): Promise<SubmitTaskResponse[]> {
    const results: SubmitTaskResponse[] = [];

    for (const request of requests) {
      try {
        const taskId = await this.submitTask(request);
        results.push({
          taskId,
          status: 'accepted',
          message: '任务已提交'
        });
      } catch (error) {
        results.push({
          taskId: '',
          status: 'failed',
          message: `任务提交失败: ${error.message}`
        });
      }
    }

    console.log(`[TaskScheduler] 📦 批量提交完成: ${results.length} 个任务`);

    return results;
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['executions']
    });

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    const progress = this.calculateProgress(task);

    return {
      id: task.id,
      status: task.status,
      progress,
      createdAt: task.createdAt.toISOString(),
      startedAt: task.startedAt?.toISOString(),
      completedAt: task.completedAt?.toISOString(),
      executions: task.executions || [],
    };
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStatistics(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    const stats = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status, COUNT(*) as count')
      .groupBy('task.status')
      .getRawMany();

    const result = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };

    stats.forEach(stat => {
      result[stat.status] = parseInt(stat.count);
    });

    return result;
  }

  /**
   * 计算任务进度
   */
  private calculateProgress(task: CrawlTaskEntity): number {
    switch (task.status) {
      case 'pending':
        return 0;
      case 'running':
        return 50;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }
}