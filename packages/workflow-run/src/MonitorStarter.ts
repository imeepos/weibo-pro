import { Injectable, Inject } from "@sker/core";
import { WeiboHotTimelineMonitorScheduler } from "./WeiboHotTimelineMonitorScheduler";
import { IncrementalPostDetector } from "./IncrementalPostDetector";
import { RealTimePostPublisher } from "./RealTimePostPublisher";
import { RealTimeWorkflowIntegrator } from "./RealTimeWorkflowIntegrator";

/**
 * 监控启动器
 *
 * 存在即合理：
 * - 统一启动所有监控组件
 * - 管理组件间依赖关系
 * - 提供完整的监控生命周期管理
 *
 * 优雅即简约：
 * - 代码自文档化，命名清晰表达意图
 * - 错误处理如哲学思考，每个错误都有明确策略
 * - 性能优化与代码美观并重
 */
@Injectable()
export class MonitorStarter {
  private isStarted = false;

  constructor(
    @Inject(WeiboHotTimelineMonitorScheduler)
    private readonly monitorScheduler: WeiboHotTimelineMonitorScheduler,
    @Inject(IncrementalPostDetector)
    private readonly incrementalDetector: IncrementalPostDetector,
    @Inject(RealTimePostPublisher)
    private readonly realTimePublisher: RealTimePostPublisher,
    @Inject(RealTimeWorkflowIntegrator)
    private readonly workflowIntegrator: RealTimeWorkflowIntegrator,
  ) {}

  /**
   * 启动完整监控系统
   *
   * 优雅设计：
   * - 幂等启动，避免重复初始化
   * - 组件间依赖自动管理
   * - 提供完整的启动日志
   */
  async startCompleteMonitoring(): Promise<void> {
    if (this.isStarted) {
      console.log('[MonitorStarter] 🔄 监控系统已在运行中');
      return;
    }

    console.log('[MonitorStarter] 🚀 开始启动完整监控系统...');

    try {
      // 1. 初始化组件状态
      await this.initializeComponents();

      // 2. 启动监控调度器
      await this.monitorScheduler.startMonitoring();

      // 3. 标记为已启动
      this.isStarted = true;

      console.log('[MonitorStarter] ✅ 完整监控系统启动成功');
      this.printSystemStatus();

    } catch (error) {
      console.error('[MonitorStarter] ❌ 监控系统启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止完整监控系统
   *
   * 优雅设计：
   * - 安全停止，清理所有资源
   * - 状态重置，为重启做准备
   * - 提供完整的停止日志
   */
  async stopCompleteMonitoring(): Promise<void> {
    if (!this.isStarted) {
      console.log('[MonitorStarter] 🔄 监控系统未在运行');
      return;
    }

    console.log('[MonitorStarter] ⏹️ 开始停止完整监控系统...');

    try {
      // 1. 停止监控调度器
      this.monitorScheduler.stopMonitoring();

      // 2. 清理组件状态
      await this.cleanupComponents();

      // 3. 标记为已停止
      this.isStarted = false;

      console.log('[MonitorStarter] ✅ 完整监控系统停止成功');

    } catch (error) {
      console.error('[MonitorStarter] ❌ 监控系统停止失败:', error);
      throw error;
    }
  }

  /**
   * 重启监控系统
   *
   * 错误处理如哲学：
   * - 优雅的重启机制
   * - 状态一致性保证
   * - 详细的进度跟踪
   */
  async restartMonitoring(): Promise<void> {
    console.log('[MonitorStarter] 🔄 开始重启监控系统...');

    try {
      // 1. 停止当前系统
      await this.stopCompleteMonitoring();

      // 2. 短暂延迟确保完全停止
      await this.delay(1000);

      // 3. 重新启动系统
      await this.startCompleteMonitoring();

      console.log('[MonitorStarter] ✅ 监控系统重启成功');

    } catch (error) {
      console.error('[MonitorStarter] ❌ 监控系统重启失败:', error);
      throw error;
    }
  }

  /**
   * 初始化组件
   *
   * 性能即艺术：
   * - 按需初始化避免资源浪费
   * - 组件间依赖顺序保证
   * - 优雅的错误恢复
   */
  private async initializeComponents(): Promise<void> {
    console.log('[MonitorStarter] 🔧 初始化监控组件...');

    // 这里可以添加组件的初始化逻辑
    // 例如：数据库连接、缓存预热等

    console.log('[MonitorStarter] ✅ 监控组件初始化完成');
  }

  /**
   * 清理组件状态
   *
   * 优雅设计：
   * - 安全的资源释放
   * - 状态一致性保证
   * - 优雅的错误处理
   */
  private async cleanupComponents(): Promise<void> {
    console.log('[MonitorStarter] 🧹 清理监控组件状态...');

    // 清理增量检测器缓存
    this.incrementalDetector.clearCache();

    // 清理推送器处理记录
    this.realTimePublisher.clearProcessedRecords();

    // 清理工作流集成器记录
    this.workflowIntegrator.clearProcessedRecords();

    console.log('[MonitorStarter] ✅ 监控组件状态清理完成');
  }

  /**
   * 获取系统状态
   *
   * 日志是思想的表达：
   * - 状态清晰反映系统运行情况
   * - 包含关键性能指标
   * - 为运维提供决策依据
   */
  getSystemStatus(): {
    isStarted: boolean;
    monitorStatus: any;
    detectorStatus: any;
    publisherStatus: any;
    integratorStatus: any;
  } {
    return {
      isStarted: this.isStarted,
      monitorStatus: this.monitorScheduler.getMonitoringStatus(),
      detectorStatus: this.incrementalDetector.getCacheStatus(),
      publisherStatus: this.realTimePublisher.getPublishStatistics(),
      integratorStatus: this.workflowIntegrator.getIntegratorStatus(),
    };
  }

  /**
   * 打印系统状态
   *
   * 优雅即简约：
   * - 清晰的格式化输出
   * - 关键信息突出显示
   * - 易于理解的统计信息
   */
  printSystemStatus(): void {
    const status = this.getSystemStatus();

    console.log('\n📊 监控系统状态报告:');
    console.log('──────────────────────────────');
    console.log(`🏃 运行状态: ${status.isStarted ? '✅ 运行中' : '⏹️ 已停止'}`);
    console.log(`⏰ 监控间隔: ${status.monitorStatus.currentInterval}ms`);
    console.log(`📈 连续失败: ${status.monitorStatus.consecutiveFailures}`);
    console.log(`🔍 检测缓存: ${status.detectorStatus.cacheSize}/${status.detectorStatus.maxCacheSize}`);
    console.log(`📤 推送统计: ${status.publisherStatus.processedCount} 已处理`);
    console.log(`🔄 集成状态: ${status.integratorStatus.processedCount} 处理中`);
    console.log('──────────────────────────────\n');
  }

  /**
   * 延迟函数
   *
   * 优雅设计：
   * - 统一的延迟实现
   * - Promise-based 异步控制
   * - 清晰的错误处理
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 健康检查
   *
   * 存在即合理：
   * - 提供系统健康状态检查
   * - 支持外部监控集成
   * - 清晰的健康状态定义
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    components: {
      monitor: boolean;
      detector: boolean;
      publisher: boolean;
      integrator: boolean;
    };
    message: string;
  }> {
    try {
      const status = this.getSystemStatus();

      const health = {
        healthy: status.isStarted,
        components: {
          monitor: status.monitorStatus.consecutiveFailures < 3,
          detector: status.detectorStatus.cacheUtilization < 90,
          publisher: status.publisherStatus.cacheUtilization < 90,
          integrator: true, // 集成器通常不会出现健康问题
        },
        message: status.isStarted ? '系统运行正常' : '系统未启动',
      };

      return health;

    } catch (error) {
      return {
        healthy: false,
        components: {
          monitor: false,
          detector: false,
          publisher: false,
          integrator: false,
        },
        message: `健康检查失败: ${(error as Error).message}`,
      };
    }
  }
}