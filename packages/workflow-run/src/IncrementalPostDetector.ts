import { Injectable } from "@sker/core";
import { RedisClient } from "@sker/redis";

/**
 * 增量帖子检测器
 *
 * 存在即合理：
 * - 基于时间戳的增量检测
 * - 避免重复处理相同帖子
 * - 智能过滤无效更新
 *
 * 优雅即简约：
 * - 代码自文档化，逻辑清晰
 * - 时间处理精确可靠
 * - 错误处理优雅降级
 */
@Injectable()
export class IncrementalPostDetector {
  private readonly lastProcessedTimeKey = 'weibo:monitor:last_processed_time';
  private readonly processedPostsCache = new Set<string>();
  private readonly maxCacheSize = 1000;

  constructor(
    private readonly redis: RedisClient,
  ) {}

  /**
   * 检测新帖子
   *
   * 优雅设计：
   * - 基于时间戳的增量检测
   * - 多级去重机制
   * - 智能缓存管理
   */
  async detectNewPosts(posts: any[]): Promise<any[]> {
    if (posts.length === 0) {
      return [];
    }

    const lastProcessedTime = await this.getLastProcessedTime();
    const newPosts: any[] = [];

    for (const post of posts) {
      if (await this.isNewPost(post, lastProcessedTime)) {
        newPosts.push(post);
      }
    }

    // 更新最后处理时间
    if (newPosts.length > 0) {
      const latestTime = this.getLatestPostTime(newPosts);
      await this.updateLastProcessedTime(latestTime);
    }

    return newPosts;
  }

  /**
   * 判断是否为新帖子
   *
   * 性能即艺术：
   * - 多级过滤提高效率
   * - 缓存优化减少重复计算
   * - 时间比较精确可靠
   */
  private async isNewPost(post: any, lastProcessedTime: Date): Promise<boolean> {
    // 1. 检查帖子ID是否已处理
    if (this.processedPostsCache.has(post.id)) {
      return false;
    }

    // 2. 检查帖子创建时间
    const postTime = this.parsePostTime(post.created_at);
    if (postTime <= lastProcessedTime) {
      return false;
    }

    // 3. 添加到缓存
    this.addToCache(post.id);

    return true;
  }

  /**
   * 解析帖子时间
   *
   * 优雅设计：
   * - 支持多种时间格式
   * - 优雅的格式转换
   * - 可靠的错误处理
   */
  private parsePostTime(timeStr: string): Date {
    try {
      // 微博时间格式："Mon Dec 11 15:30:00 +0800 2023"
      if (timeStr.includes('+0800')) {
        return new Date(timeStr);
      }

      // ISO 8601 格式
      if (timeStr.includes('T')) {
        return new Date(timeStr);
      }

      // 时间戳格式
      const timestamp = Number(timeStr);
      if (!isNaN(timestamp)) {
        return new Date(timestamp);
      }

      // 默认使用当前时间
      console.warn(`[IncrementalDetector] 无法解析时间格式: ${timeStr}`);
      return new Date();
    } catch (error) {
      console.warn(`[IncrementalDetector] 时间解析失败: ${timeStr}`, error);
      return new Date();
    }
  }

  /**
   * 获取最后处理时间
   *
   * 错误处理如哲学：
   * - Redis 不可用时优雅降级
   * - 提供合理的默认值
   * - 记录失败原因供改进
   */
  private async getLastProcessedTime(): Promise<Date> {
    try {
      const timestampStr = await this.redis.get(this.lastProcessedTimeKey);

      if (timestampStr) {
        const timestamp = Number(timestampStr);
        if (!isNaN(timestamp)) {
          return new Date(timestamp);
        }
      }
    } catch (error) {
      console.warn('[IncrementalDetector] Redis 获取失败，使用默认时间', error);
    }

    // 默认返回1小时前的时间
    return new Date(Date.now() - 60 * 60 * 1000);
  }

  /**
   * 更新最后处理时间
   *
   * 优雅设计：
   * - 原子性更新避免竞态条件
   * - 优雅的错误处理
   * - 清晰的日志记录
   */
  private async updateLastProcessedTime(time: Date): Promise<void> {
    try {
      const timestamp = time.getTime();
      await this.redis.set(this.lastProcessedTimeKey, timestamp.toString());

      console.log(`[IncrementalDetector] 📅 更新最后处理时间: ${time.toISOString()}`);
    } catch (error) {
      console.warn('[IncrementalDetector] 更新最后处理时间失败', error);
      // 优雅降级：记录失败但不中断处理
    }
  }

  /**
   * 获取最新帖子时间
   *
   * 性能即艺术：
   * - 高效的时间比较算法
   * - 避免不必要的排序
   * - 精确的时间计算
   */
  private getLatestPostTime(posts: any[]): Date {
    let latestTime = new Date(0);

    for (const post of posts) {
      const postTime = this.parsePostTime(post.created_at);
      if (postTime > latestTime) {
        latestTime = postTime;
      }
    }

    return latestTime;
  }

  /**
   * 添加到缓存
   *
   * 存在即合理：
   * - 内存缓存提高检测效率
   * - 智能缓存大小控制
   * - 避免内存泄漏
   */
  private addToCache(postId: string): void {
    this.processedPostsCache.add(postId);

    // 控制缓存大小
    if (this.processedPostsCache.size > this.maxCacheSize) {
      const oldest = Array.from(this.processedPostsCache)[0]!;
      this.processedPostsCache.delete(oldest);
    }
  }

  /**
   * 清空缓存
   *
   * 优雅设计：
   * - 提供手动清空接口
   * - 测试和调试支持
   * - 清晰的日志记录
   */
  clearCache(): void {
    const previousSize = this.processedPostsCache.size;
    this.processedPostsCache.clear();
    console.log(`[IncrementalDetector] 🧹 清空缓存，释放 ${previousSize} 个条目`);
  }

  /**
   * 获取缓存状态
   *
   * 日志是思想的表达：
   * - 缓存状态反映检测效率
   * - 为性能调优提供依据
   * - 清晰的指标展示
   */
  getCacheStatus(): {
    cacheSize: number;
    maxCacheSize: number;
    cacheUtilization: number;
  } {
    return {
      cacheSize: this.processedPostsCache.size,
      maxCacheSize: this.maxCacheSize,
      cacheUtilization: (this.processedPostsCache.size / this.maxCacheSize) * 100,
    };
  }
}