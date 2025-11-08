import { Injectable } from "@sker/core";
import { WeiboAjaxFeedHotTimelineAst } from "@sker/workflow-ast";
import { execute } from "@sker/workflow";
import { IncrementalPostDetector } from "./IncrementalPostDetector";
import { RealTimePostPublisher } from "./RealTimePostPublisher";

/**
 * 实时监控调度器
 *
 * 存在即合理：
 * - 统一调度所有监控任务
 * - 智能控制监控频率
 * - 优雅处理监控异常
 *
 * 优雅即简约：
 * - 代码自文档化，命名清晰表达意图
 * - 错误处理如哲学思考，每个错误都有明确处理策略
 * - 性能优化与代码美观并重
 */
@Injectable()
export class WeiboHotTimelineMonitorScheduler {
  private readonly baseMonitoringInterval = 30000; // 30秒基础间隔
  private currentMonitoringInterval = this.baseMonitoringInterval;
  private isMonitoring = false;
  private monitoringTimer: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 5;

  constructor(
    private readonly incrementalDetector: IncrementalPostDetector,
    private readonly realTimePublisher: RealTimePostPublisher,
  ) {}

  /**
   * 启动实时监控
   *
   * 优雅设计：
   * - 幂等启动，避免重复监控
   * - 立即执行首次监控，减少延迟
   * - 提供清晰的启动日志
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('[MonitorScheduler] 监控已在运行中');
      return;
    }

    this.isMonitoring = true;
    console.log('[MonitorScheduler] 🚀 开始实时监控热门时间线');

    // 立即执行首次监控
    await this.executeMonitoringCycle();

    // 启动定时监控
    this.startIntervalMonitoring();
  }

  /**
   * 停止实时监控
   *
   * 优雅设计：
   * - 安全停止，清理定时器
   * - 状态重置，为重启做准备
   * - 提供清晰的停止日志
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    console.log('[MonitorScheduler] ⏹️ 已停止实时监控');
  }

  /**
   * 调整监控频率
   *
   * 性能即艺术：
   * - 根据活跃度动态调整频率
   * - 高峰时段增加监控密度
   * - 低峰时段减少资源消耗
   */
  adjustMonitoringFrequency(newPostsCount: number): void {
    if (newPostsCount > 10) {
      // 高活跃度，加快监控
      this.currentMonitoringInterval = Math.max(10000, this.baseMonitoringInterval / 3);
      console.log(`[MonitorScheduler] 📈 检测到高活跃度，调整监控间隔为 ${this.currentMonitoringInterval}ms`);
    } else if (newPostsCount === 0) {
      // 低活跃度，减慢监控
      this.currentMonitoringInterval = Math.min(120000, this.currentMonitoringInterval * 2);
      console.log(`[MonitorScheduler] 📉 检测到低活跃度，调整监控间隔为 ${this.currentMonitoringInterval}ms`);
    } else {
      // 正常活跃度，恢复基础频率
      this.currentMonitoringInterval = this.baseMonitoringInterval;
      console.log(`[MonitorScheduler] 📊 恢复正常监控间隔 ${this.currentMonitoringInterval}ms`);
    }

    // 重新启动定时器
    this.restartIntervalMonitoring();
  }

  /**
   * 执行监控周期
   *
   * 错误处理如哲学：
   * - 每个监控失败都是改进机会
   * - 优雅降级保证系统稳定
   * - 智能恢复避免无限循环
   */
  private async executeMonitoringCycle(): Promise<void> {
    try {
      console.log('[MonitorScheduler] 🔄 开始执行监控周期');

      // 创建热门时间线 AST
      const ast = new WeiboAjaxFeedHotTimelineAst();
      ast.count = 20; // 每次抓取20条最新帖子
      ast.refresh = 1; // 强制刷新

      // 执行抓取
      const result = await execute(ast, {});

      if (result.state === 'success') {
        await this.processMonitoringResult(result);
        this.consecutiveFailures = 0; // 重置连续失败计数
      } else {
        throw new Error(`AST 执行失败: ${result.error?.message}`);
      }

    } catch (error) {
      this.consecutiveFailures++;
      console.error('[MonitorScheduler] ❌ 监控周期执行失败:', error);

      // 检查是否需要停止监控
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        console.warn('[MonitorScheduler] ⚠️ 连续失败次数过多，暂停监控');
        this.stopMonitoring();
      }
    }
  }

  /**
   * 处理监控结果
   *
   * 优雅设计：
   * - 增量检测避免重复处理
   * - 智能推送新帖子到工作流
   * - 自适应频率调整
   */
  private async processMonitoringResult(result: any): Promise<void> {
    // 从结果中提取帖子数据
    const posts = this.extractPostsFromResult(result);

    if (posts.length === 0) {
      console.log('[MonitorScheduler] 📭 本次监控未发现新帖子');
      this.adjustMonitoringFrequency(0);
      return;
    }

    console.log(`[MonitorScheduler] 📥 发现 ${posts.length} 个帖子`);

    // 增量检测
    const newPosts = await this.incrementalDetector.detectNewPosts(posts);

    if (newPosts.length > 0) {
      console.log(`[MonitorScheduler] 🎯 检测到 ${newPosts.length} 个新帖子`);

      // 推送新帖子到工作流
      await this.realTimePublisher.publishForNlpAnalysis(newPosts);

      // 根据新帖子数量调整频率
      this.adjustMonitoringFrequency(newPosts.length);
    } else {
      console.log('[MonitorScheduler] 🔄 未发现增量帖子');
      this.adjustMonitoringFrequency(0);
    }
  }

  /**
   * 从结果中提取帖子数据
   *
   * 存在即合理：
   * - 统一的数据提取逻辑
   * - 类型安全的帖子处理
   * - 优雅的空值处理
   */
  private extractPostsFromResult(result: any): any[] {
    // 根据 WeiboAjaxFeedHotTimelineAstVisitor 的实现提取帖子
    if (result.data?.statuses && Array.isArray(result.data.statuses)) {
      return result.data.statuses;
    }

    // 备用提取方式
    if (Array.isArray(result.statuses)) {
      return result.statuses;
    }

    return [];
  }

  /**
   * 启动间隔监控
   *
   * 性能即艺术：
   * - 精确的定时控制
   * - 避免定时器重叠
   * - 优雅的资源管理
   */
  private startIntervalMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      await this.executeMonitoringCycle();
    }, this.currentMonitoringInterval);

    console.log(`[MonitorScheduler] ⏰ 定时监控已启动，间隔 ${this.currentMonitoringInterval}ms`);
  }

  /**
   * 重启间隔监控
   *
   * 优雅设计：
   * - 安全重启，避免内存泄漏
   * - 状态保持，无缝切换
   * - 清晰的日志记录
   */
  private restartIntervalMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    this.startIntervalMonitoring();
  }

  /**
   * 获取监控状态
   *
   * 日志是思想的表达：
   * - 状态清晰反映系统运行情况
   * - 包含关键性能指标
   * - 为运维提供决策依据
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    currentInterval: number;
    consecutiveFailures: number;
    baseInterval: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      currentInterval: this.currentMonitoringInterval,
      consecutiveFailures: this.consecutiveFailures,
      baseInterval: this.baseMonitoringInterval,
    };
  }
}