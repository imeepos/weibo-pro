import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { TaskSchedulerService } from '../services/task-scheduler.service';
import { SubmitTaskRequest, BatchSubmitTasksRequest, SubmitTaskResponse, TaskStatusResponse } from '../types/api.types';

/**
 * Broker主控制器
 *
 * 存在即合理：
 * - 统一的任务提交和管理接口
 * - 清晰的API设计和错误处理
 * - 类型安全的请求/响应
 */
@Controller('tasks')
export class BrokerController {
  constructor(private readonly taskScheduler: TaskSchedulerService) {}

  /**
   * 提交单个任务
   */
  @Post()
  async submitTask(@Body() request: SubmitTaskRequest): Promise<SubmitTaskResponse> {
    try {
      const taskId = await this.taskScheduler.submitTask(request);
      return {
        taskId,
        status: 'accepted',
        message: '任务已提交'
      };
    } catch (error) {
      throw new HttpException(
        `任务提交失败: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 批量提交任务
   */
  @Post('batch')
  async submitTasksBatch(@Body() request: BatchSubmitTasksRequest): Promise<SubmitTaskResponse[]> {
    try {
      const results = await this.taskScheduler.submitTasksBatch(request.tasks);
      return results;
    } catch (error) {
      throw new HttpException(
        `批量任务提交失败: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 获取任务状态
   */
  @Get(':taskId')
  async getTaskStatus(@Param('taskId') taskId: string): Promise<TaskStatusResponse> {
    try {
      const status = await this.taskScheduler.getTaskStatus(taskId);
      return status;
    } catch (error) {
      throw new HttpException(
        `任务状态查询失败: ${error.message}`,
        HttpStatus.NOT_FOUND
      );
    }
  }
}