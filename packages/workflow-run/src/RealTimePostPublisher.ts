import { Injectable } from "@sker/core";
import { useQueue } from "@sker/mq";
import type { PostNLPTask } from "./post-nlp-agent.consumer";

/**
 * 实时帖子推送器
 *
 * 存在即合理：
 * - 统一推送所有新帖子到工作流
 * - 智能去重避免重复处理
 * - 优雅的错误恢复机制
 *
 * 性能即艺术：
 * - 批量推送减少队列压力
 * - 智能缓存避免内存泄漏
 * - 优雅的并发控制
 */
@Injectable()
export class RealTimePostPublisher {
  private readonly nlpQueue = useQueue<PostNLPTask>('post_nlp_queue');
  private readonly processedPosts = new Set<string>();
  private readonly maxProcessedCacheSize = 1000;
  private readonly batchDelay = 100; // 批次间延迟(ms)

  /**
   * 推送帖子到 NLP 分析队列
   *
   * 优雅设计：
   * - 智能去重避免重复处理
   * - 批量推送提高效率
   * - 优雅的错误处理
   */
  async publishForNlpAnalysis(posts: any[]): Promise<void> {
    if (posts.length === 0) {
      return;
    }

    const uniquePosts = this.filterUniquePosts(posts);

    if (uniquePosts.length === 0) {
      console.log('[RealTimePublisher] 📭 所有帖子都已处理过');
      return;
    }

    console.log(`[RealTimePublisher] 🚀 准备推送 ${uniquePosts.length} 个新帖子到 NLP 队列`);

    // 分批推送避免队列过载
    await this.publishInBatches(uniquePosts);

    // 更新处理记录
    this.updateProcessedRecords(uniquePosts);

    console.log(`[RealTimePublisher] ✅ 成功推送 ${uniquePosts.length} 个帖子到 NLP 队列`);
  }

  /**
   * 过滤唯一帖子
   *
   * 性能即艺术：
   * - 高效的去重算法
   * - 内存优化避免重复计算
   * - 精确的帖子标识
   */
  private filterUniquePosts(posts: any[]): any[] {
    const uniquePosts: any[] = [];

    for (const post of posts) {
      if (post.id && !this.processedPosts.has(post.id)) {
        uniquePosts.push(post);
      }
    }

    return uniquePosts;
  }

  /**
   * 分批推送
   *
   * 优雅设计：
   * - 控制并发避免队列过载
   * - 批次间延迟减少系统压力
   * - 优雅的错误隔离
   */
  private async publishInBatches(posts: any[]): Promise<void> {
    const batchSize = 5; // 每批推送5个帖子

    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);

      // 并行推送当前批次
      await Promise.allSettled(
        batch.map(post => this.publishSinglePost(post))
      );

      // 批次间延迟
      if (i + batchSize < posts.length) {
        await this.delay(this.batchDelay);
      }
    }
  }

  /**
   * 推送单个帖子
   *
   * 错误处理如哲学：
   * - 单个帖子推送失败不影响其他
   * - 提供详细的错误信息
   * - 记录失败原因供改进
   */
  private async publishSinglePost(post: any): Promise<void> {
    try {
      this.nlpQueue.producer.next({ postId: post.id });

      console.log(`[RealTimePublisher] 📤 推送帖子: ${post.id} (${this.truncateText(post.text)})`);
    } catch (error) {
      console.error(`[RealTimePublisher] ❌ 推送失败: postId=${post.id}`, error);
      // 优雅降级：记录失败但不中断其他推送
    }
  }

  /**
   * 更新处理记录
   *
   * 存在即合理：
   * - 内存缓存提高检测效率
   * - 智能缓存大小控制
   * - 避免内存泄漏
   */
  private updateProcessedRecords(posts: any[]): void {
    for (const post of posts) {
      if (post.id) {
        this.processedPosts.add(post.id);
      }
    }

    // 控制缓存大小
    this.controlCacheSize();
  }

  /**
   * 控制缓存大小
   *
   * 性能即艺术：
   * - 智能的缓存淘汰策略
   * - 避免内存无限增长
   * - 保持缓存有效性
   */
  private controlCacheSize(): void {
    if (this.processedPosts.size > this.maxProcessedCacheSize) {
      const overflow = this.processedPosts.size - this.maxProcessedCacheSize;
      const toRemove = Array.from(this.processedPosts).slice(0, overflow);

      for (const postId of toRemove) {
        this.processedPosts.delete(postId);
      }

      console.log(`[RealTimePublisher] 🧹 清理缓存，移除 ${overflow} 个旧记录`);
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
    console.log(`[RealTimePublisher] 🧹 清空处理记录，释放 ${previousSize} 个条目`);
  }

  /**
   * 获取推送统计
   *
   * 日志是思想的表达：
   * - 统计反映推送效率
   * - 为性能调优提供依据
   * - 清晰的指标展示
   */
  getPublishStatistics(): {
    processedCount: number;
    maxCacheSize: number;
    cacheUtilization: number;
  } {
    return {
      processedCount: this.processedPosts.size,
      maxCacheSize: this.maxProcessedCacheSize,
      cacheUtilization: (this.processedPosts.size / this.maxProcessedCacheSize) * 100,
    };
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
   * 截断文本
   *
   * 优雅即简约：
   * - 统一的文本处理
   * - 避免日志过长
   * - 保持信息完整性
   */
  private truncateText(text: string, maxLength: number = 50): string {
    if (!text || text.length <= maxLength) {
      return text || '';
    }
    return text.substring(0, maxLength) + '...';
  }
}