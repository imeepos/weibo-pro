import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { WeiboPostEntity } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';

// 星期名称映射
const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const CHINA_TIME_OFFSET_MS = 8 * 60 * 60 * 1000;

export interface PostingTimeHeatmap {
  hourlyDistribution: number[];   // 24小时分布 [0-23]
  weekdayDistribution: number[];  // 7天分布 [0-6, 0=周日]
  heatmapMatrix: number[][];      // 7x24 热力矩阵（归一化 0-1）
  peakTime: {
    hour: number;
    weekday: number;
    count: number;
    label: string;
  };
  offPeakTime: {
    hour: number;
    weekday: number;
    count: number;
    label: string;
  };
  totalPosts: number;
  insights: string[];
}

@Injectable({ providedIn: 'root' })
export class PostingTimeService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  /**
   * 获取发帖时间热力图数据
   */
  async getPostingTimeHeatmap(eventId: string): Promise<PostingTimeHeatmap> {
    const cacheKey = CacheService.buildKey('posting:time', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchPostingTimeHeatmap(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchPostingTimeHeatmap(eventId: string): Promise<PostingTimeHeatmap> {
    return useEntityManager(async (manager) => {
      // 查询事件的所有帖子
      const posts = await manager
        .createQueryBuilder(WeiboPostEntity, 'post')
        .where('post.event_id = :eventId', { eventId })
        .andWhere('post.created_at IS NOT NULL')
        .orderBy('post.created_at', 'ASC')
        .limit(10000)
        .getMany();

      if (posts.length === 0) {
        return this.getDefaultHeatmap();
      }

      // 初始化统计数组
      const hourlyDistribution = new Array(24).fill(0);
      const weekdayDistribution = new Array(7).fill(0);
      const rawMatrix = Array(7).fill(null).map(() => Array(24).fill(0));

      // 统计每个帖子的时间分布
      for (const post of posts) {
        if (!post.created_at) continue;

        const date = new Date(post.created_at);
        const chinaDate = new Date(date.getTime() + CHINA_TIME_OFFSET_MS);
        const hour = chinaDate.getUTCHours();   // 0-23, 固定按北京时间统计
        const weekday = chinaDate.getUTCDay();  // 0-6 (0=周日), 固定按北京时间统计

        hourlyDistribution[hour]++;
        weekdayDistribution[weekday]++;
        rawMatrix[weekday][hour]++;
      }

      // 归一化热力矩阵
      const heatmapMatrix = this.normalizeMatrix(rawMatrix);

      // 找出峰值和低谷时间
      const { peakTime, offPeakTime } = this.findPeakAndOffPeakTimes(rawMatrix);

      // 生成洞察
      const insights = this.generateInsights(
        hourlyDistribution,
        weekdayDistribution,
        peakTime,
        posts.length
      );

      return {
        hourlyDistribution,
        weekdayDistribution,
        heatmapMatrix,
        peakTime,
        offPeakTime,
        totalPosts: posts.length,
        insights,
      };
    });
  }

  /**
   * 归一化矩阵到 0-1 范围
   */
  private normalizeMatrix(matrix: number[][]): number[][] {
    const flatValues = matrix.flat();
    const maxCount = Math.max(...flatValues);

    if (maxCount === 0) {
      return matrix.map(row => row.map(() => 0));
    }

    return matrix.map(row =>
      row.map(count => count / maxCount)
    );
  }

  /**
   * 找出峰值和低谷时间
   */
  private findPeakAndOffPeakTimes(matrix: number[][]): {
    peakTime: PostingTimeHeatmap['peakTime'];
    offPeakTime: PostingTimeHeatmap['offPeakTime'];
  } {
    let maxCount = 0;
    let minCount = Infinity;
    let maxWeekday = 0;
    let maxHour = 0;
    let minWeekday = 0;
    let minHour = 0;

    for (let weekday = 0; weekday < 7; weekday++) {
      for (let hour = 0; hour < 24; hour++) {
        const count = matrix[weekday][hour];

        if (count > maxCount) {
          maxCount = count;
          maxWeekday = weekday;
          maxHour = hour;
        }

        if (count < minCount) {
          minCount = count;
          minWeekday = weekday;
          minHour = hour;
        }
      }
    }

    const peakTime: PostingTimeHeatmap['peakTime'] = {
      hour: maxHour,
      weekday: maxWeekday,
      count: maxCount,
      label: `${WEEKDAY_NAMES[maxWeekday]} ${String(maxHour).padStart(2, '0')}:00`,
    };

    const offPeakTime: PostingTimeHeatmap['offPeakTime'] = {
      hour: minHour,
      weekday: minWeekday,
      count: minCount === Infinity ? 0 : minCount,
      label: `${WEEKDAY_NAMES[minWeekday]} ${String(minHour).padStart(2, '0')}:00`,
    };

    return { peakTime, offPeakTime };
  }

  /**
   * 生成洞察
   */
  private generateInsights(
    hourlyDistribution: number[],
    weekdayDistribution: number[],
    peakTime: PostingTimeHeatmap['peakTime'],
    totalPosts: number
  ): string[] {
    const insights: string[] = [];

    // 检查工作时间发帖模式 (9-18点)
    const workHourPosts = hourlyDistribution.slice(9, 19).reduce((sum, count) => sum + count, 0);
    if (workHourPosts > totalPosts * 0.5) {
      insights.push('发帖高峰集中在工作时间');
    }

    // 检查周末活跃度
    const weekendPosts = weekdayDistribution[0] + weekdayDistribution[6];
    if (weekendPosts > totalPosts * 0.4) {
      insights.push('周末发帖活跃度较高');
    }

    // 检查深夜模式 (0-6点)
    const lateNightPosts = hourlyDistribution.slice(0, 7).reduce((sum, count) => sum + count, 0);
    if (lateNightPosts > totalPosts * 0.3) {
      insights.push('深夜发帖活跃度较高');
    }

    // 检查早晨模式 (6-9点)
    const morningPosts = hourlyDistribution.slice(6, 10).reduce((sum, count) => sum + count, 0);
    if (morningPosts > totalPosts * 0.2) {
      insights.push('早晨发帖较为活跃');
    }

    // 峰值时间提示
    if (peakTime.count > 0) {
      insights.push(`最高峰时段：${peakTime.label}`);
    }

    return insights;
  }

  /**
   * 获取默认热力图（空数据）
   */
  private getDefaultHeatmap(): PostingTimeHeatmap {
    return {
      hourlyDistribution: new Array(24).fill(0),
      weekdayDistribution: new Array(7).fill(0),
      heatmapMatrix: Array(7).fill(null).map(() => Array(24).fill(0)),
      peakTime: {
        hour: 0,
        weekday: 0,
        count: 0,
        label: '无数据',
      },
      offPeakTime: {
        hour: 0,
        weekday: 0,
        count: 0,
        label: '无数据',
      },
      totalPosts: 0,
      insights: [],
    };
  }
}
