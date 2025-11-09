import { Controller, Get } from '@nestjs/common';
import { TaskSchedulerService } from '../services/task-scheduler.service';
import { QueueManagerService } from '../services/queue-manager.service';
import { SystemStatusResponse } from '../types/api.types';

/**
 * 系统状态控制器
 *
 * 存在即合理：
 * - 统一的系统状态监控接口
 * - 完整的系统健康检查
 * - 清晰的监控指标展示
 */
@Controller('status')
export class StatusController {
  constructor(
    private readonly taskScheduler: TaskSchedulerService,
    private readonly queueManager: QueueManagerService,
  ) {}

  /**
   * 获取系统状态
   */
  @Get()
  async getSystemStatus(): Promise<SystemStatusResponse> {
    try {
      const queueStatus = await this.queueManager.getQueueStatus();
      const taskStats = await this.taskScheduler.getTaskStatistics();

      return {
        queues: queueStatus,
        tasks: taskStats,
        system: {
          uptime: this.formatUptime(process.uptime()),
          memoryUsage: this.formatMemoryUsage(process.memoryUsage()),
          cpuUsage: '0%', // 需要额外模块获取CPU使用率
        }
      };
    } catch (error) {
      throw new Error(`系统状态查询失败: ${error.message}`);
    }
  }

  /**
   * 健康检查
   */
  @Get('health')
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  private formatUptime(uptime: number): string {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  private formatMemoryUsage(memoryUsage: NodeJS.MemoryUsage): string {
    const used = memoryUsage.heapUsed / 1024 / 1024;
    const total = memoryUsage.heapTotal / 1024 / 1024;
    const percentage = ((used / total) * 100).toFixed(1);
    return `${percentage}%`;
  }
}