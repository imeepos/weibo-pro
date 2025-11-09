import { Injectable } from "@sker/core";
import { useQueue } from "@sker/mq";
import type { PostNLPTask } from "./post-nlp-agent.consumer";
import { delay } from "./utils";

/**
 * 实时工作流集成器
 *
 * 存在即合理：
 * - 统一触发所有工作流处理
 * - 智能控制并发和批量
 * - 优雅的错误处理和重试
 *
 * 优雅即简约：
 * - 代码自文档化，命名清晰表达意图
 * - 错误处理如哲学思考，每个错误都有明确策略
 * - 性能优化与代码美观并重
 */
@Injectable()
export class RealTimeWorkflowIntegrator {
  private readonly nlpQueue = useQueue<PostNLPTask>('post_nlp_queue');
  private readonly processedPosts = new Set<string>();
  private readonly maxConcurrentBatches = 3;
  private readonly batchSize = 10;
  private readonly batchDelay = 1000; // 批次间延迟(ms)

  /**
   * 触发完整的工作流处理
   *
   * 优雅设计：
   * - 异步处理不阻塞监控
   * - 智能去重避免重复处理
   * - 提供处理状态跟踪
   */
  async triggerFullWorkflow(postId: string): Promise<void> {
    if (this.processedPosts.has(postId)) {
      console.log(`[WorkflowIntegrator] 🔄 帖子 ${postId} 已在处理中，跳过`);
      return;
    }

    try {
      // 标记为正在处理
      this.processedPosts.add(postId);

      // 1. 触发 NLP 分析工作流
      this.nlpQueue.producer.next({ postId });

      console.log(`[WorkflowIntegrator] 🚀 触发帖子 ${postId} 的完整工作流处理`);

      // 2. 可选：触发额外的事件分析
      await this.triggerEventAnalysis(postId);

    } catch (error) {
      console.error(`[WorkflowIntegrator] ❌ 工作流触发失败: postId=${postId}`, error);

      // 处理失败时移除标记，允许重试
      this.processedPosts.delete(postId);
    }
  }

  /**
   * 批量触发工作流
   *
   * 性能即艺术：
   * - 控制并发避免系统过载
   * - 批量处理提高效率
   * - 优雅的错误隔离
   */
  async triggerBatchWorkflow(postIds: string[]): Promise<{
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  }> {
    if (postIds.length === 0) {
      return { total: 0, successful: 0, failed: 0, skipped: 0 };
    }

    console.log(`[WorkflowIntegrator] 📦 开始批量处理 ${postIds.length} 个帖子`);

    const results = {
      total: postIds.length,
      successful: 0,
      failed: 0,
      skipped: 0,
    };

    // 分批处理
    for (let i = 0; i < postIds.length; i += this.batchSize) {
      const batch = postIds.slice(i, i + this.batchSize);
      const batchResults = await this.processBatch(batch);

      results.successful += batchResults.successful;
      results.failed += batchResults.failed;
      results.skipped += batchResults.skipped;

      // 批次间延迟，避免过载
      if (i + this.batchSize < postIds.length) {
        await delay();
      }
    }

    console.log(`[WorkflowIntegrator] ✅ 批量处理完成: 成功 ${results.successful}, 失败 ${results.failed}, 跳过 ${results.skipped}`);

    return results;
  }

  /**
   * 处理单个批次
   *
   * 错误处理如哲学：
   * - 单个帖子失败不影响批次
   * - 提供详细的批次统计
   * - 优雅的错误隔离
   */
  private async processBatch(postIds: string[]): Promise<{
    successful: number;
    failed: number;
    skipped: number;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
    };

    // 并行处理批次中的帖子
    const promises = postIds.map(async postId => {
      try {
        if (this.processedPosts.has(postId)) {
          results.skipped++;
          return;
        }

        this.processedPosts.add(postId);
        this.nlpQueue.producer.next({ postId });
        results.successful++;

      } catch (error) {
        console.error(`[WorkflowIntegrator] ❌ 批次处理失败: postId=${postId}`, error);
        this.processedPosts.delete(postId);
        results.failed++;
      }
    });

    await Promise.allSettled(promises);

    console.log(`[WorkflowIntegrator] 📊 批次处理: 成功 ${results.successful}, 失败 ${results.failed}, 跳过 ${results.skipped}`);

    return results;
  }

  /**
   * 触发事件分析
   *
   * 优雅设计：
   * - 可扩展的事件分析接口
   * - 异步执行不阻塞主流程
   * - 优雅的错误处理
   */
  private async triggerEventAnalysis(postId: string): Promise<void> {
    try {
      // 这里可以扩展更多的事件分析逻辑
      // 例如：热度分析、情感分析、事件关联等

      console.log(`[WorkflowIntegrator] 🔍 触发事件分析: postId=${postId}`);

      // 模拟异步事件分析
      await delay();

    } catch (error) {
      console.warn(`[WorkflowIntegrator] ⚠️ 事件分析失败: postId=${postId}`, error);
      // 优雅降级：事件分析失败不影响主流程
    }
  }

  /**
   * 清空处理记录
   *
   * 优雅设计：
   * - 提供手动清空接口
   * - 测试和调试支持
   * - 清晰的日志记录
   */
  clearProcessedRecords(): void {
    const previousSize = this.processedPosts.size;
    this.processedPosts.clear();
    console.log(`[WorkflowIntegrator] 🧹 清空处理记录，释放 ${previousSize} 个条目`);
  }

  /**
   * 获取集成器状态
   *
   * 日志是思想的表达：
   * - 状态清晰反映系统运行情况
   * - 包含关键性能指标
   * - 为运维提供决策依据
   */
  getIntegratorStatus(): {
    processedCount: number;
    batchSize: number;
    batchDelay: number;
    maxConcurrentBatches: number;
  } {
    return {
      processedCount: this.processedPosts.size,
      batchSize: this.batchSize,
      batchDelay: this.batchDelay,
      maxConcurrentBatches: this.maxConcurrentBatches,
    };
  }

  /**
   * 检查帖子是否正在处理
   *
   * 存在即合理：
   * - 提供状态查询接口
   * - 支持外部状态检查
   * - 清晰的返回结果
   */
  isPostProcessing(postId: string): boolean {
    return this.processedPosts.has(postId);
  }

  /**
   * 手动标记帖子为已处理
   *
   * 优雅设计：
   * - 支持手动状态管理
   * - 测试和调试支持
   * - 清晰的日志记录
   */
  markPostAsProcessed(postId: string): void {
    this.processedPosts.add(postId);
    console.log(`[WorkflowIntegrator] 📝 手动标记帖子 ${postId} 为已处理`);
  }
}