import { Injectable } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { EventHourlyStatisticsEntity } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type {
  PropagationVelocityAnalysis,
  VelocityTimePoint,
} from '@sker/sdk';

@Injectable({ providedIn: 'root' })
export class PropagationVelocityService {
  constructor(private readonly cacheService: CacheService) {}

  async getVelocityAnalysis(
    eventId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<PropagationVelocityAnalysis> {
    const cacheKey = CacheService.buildKey('propagation', 'velocity', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchVelocityAnalysis(eventId, startTime, endTime),
      CACHE_TTL.LONG
    );
  }

  private async fetchVelocityAnalysis(
    eventId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<PropagationVelocityAnalysis> {
    try {
      return await useEntityManager(async (manager) => {
        // 查询事件的小时统计数据
        let queryBuilder = manager
          .getRepository(EventHourlyStatisticsEntity)
          .createQueryBuilder('stats')
          .select('stats.year', 'year')
          .addSelect('stats.month', 'month')
          .addSelect('stats.day', 'day')
          .addSelect('stats.hour', 'hour')
          .addSelect('stats.post_count', 'post_count')
          .addSelect('stats.repost_count', 'repost_count')
          .where('stats.event_id = :eventId', { eventId })
          .orderBy(
            "make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0)",
            'ASC'
          );

        if (startTime) {
          queryBuilder = queryBuilder.andWhere(
            "make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) >= :startTime",
            { startTime }
          );
        }

        if (endTime) {
          queryBuilder = queryBuilder.andWhere(
            "make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) < :endTime",
            { endTime }
          );
        }

        const statistics = await queryBuilder.getRawMany();

        if (statistics.length === 0) {
          return this.getDefaultAnalysis(eventId);
        }

        // 按时间排序（确保在mock环境下也能正确排序）
        statistics.sort((a, b) => {
          const timeA = new Date(a.year, a.month - 1, a.day, a.hour).getTime();
          const timeB = new Date(b.year, b.month - 1, b.day, b.hour).getTime();
          return timeA - timeB;
        });

        // 构建时间序列
        const timeline = this.buildVelocityTimeline(statistics);

        // 计算各项指标
        const velocities = timeline.map((p) => p.velocity);
        const currentVelocity = velocities[velocities.length - 1] || 0;
        const peakVelocity = Math.max(...velocities, 0);
        const avgVelocity =
          velocities.length > 0
            ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length
            : 0;

        // 计算加速度
        const acceleration = this.calculateAcceleration(timeline);
        const accelerationTrend = this.determineAccelerationTrend(timeline);

        // 计算平均加速度（用于传播阶段识别）
        const accelerations = timeline.map((p) => p.acceleration);
        const avgAcceleration =
          accelerations.length > 0
            ? accelerations.reduce((sum, a) => sum + a, 0) / accelerations.length
            : 0;

        // 爆发点预测
        const { predictedBurstTime, burstProbability } = this.predictBurstPoint(
          timeline,
          acceleration
        );

        // 识别传播阶段
        const currentPhase = this.identifyPhase(
          currentVelocity,
          avgAcceleration
        );

        // 获取阶段开始时间（最近一次阶段变化的时间）
        const phaseStartTime = this.identifyPhaseStartTime(
          timeline,
          currentPhase
        );

        return {
          currentVelocity,
          peakVelocity,
          avgVelocity,
          acceleration,
          accelerationTrend,
          velocityTimeline: timeline,
          predictedBurstTime,
          burstProbability,
          currentPhase,
          phaseStartTime,
          eventId,
          calculatedAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('Failed to calculate propagation velocity:', error);
      return this.getDefaultAnalysis(eventId);
    }
  }

  /**
   * 构建速度时间线
   */
  private buildVelocityTimeline(
    statistics: Array<any>
  ): VelocityTimePoint[] {
    const timeline: VelocityTimePoint[] = [];
    let cumulativeReposts = 0;

    for (let i = 0; i < statistics.length; i++) {
      const stat = statistics[i];
      const velocity = stat.repost_count || 0;
      const acceleration =
        i > 0 ? velocity - (statistics[i - 1]?.repost_count || 0) : 0;

      cumulativeReposts += velocity;

      const timestamp = new Date(
        stat.year,
        stat.month - 1,
        stat.day,
        stat.hour,
        0,
        0
      ).toISOString();

      timeline.push({
        timestamp,
        velocity,
        acceleration,
        cumulativeReposts,
      });
    }

    return timeline;
  }

  /**
   * 计算当前加速度
   */
  private calculateAcceleration(timeline: VelocityTimePoint[]): number {
    if (timeline.length === 0) return 0;
    return timeline[timeline.length - 1]!.acceleration;
  }

  /**
   * 判断加速度趋势
   * 基于速度的变化来判断
   * - increasing: 速度在加速增长（加速度持续增加）
   * - decreasing: 速度在加速下降（加速度持续减小或为负且绝对值增加）
   * - stable: 速度变化稳定
   */
  private determineAccelerationTrend(
    timeline: VelocityTimePoint[]
  ): 'increasing' | 'stable' | 'decreasing' {
    if (timeline.length < 3) {
      return 'stable';
    }

    // 获取加速度，不包括第一个0
    const accelerations = timeline.map((p) => p.acceleration).slice(1);

    if (accelerations.length < 2) {
      return 'stable';
    }

    // 计算加速度的变化
    let increasingCount = 0;
    let decreasingCount = 0;

    for (let i = 1; i < accelerations.length; i++) {
      const currentAccel = accelerations[i]!;
      const prevAccel = accelerations[i - 1]!;
      const diff = currentAccel - prevAccel;

      if (diff > 5) {
        increasingCount++;
      } else if (diff < -5) {
        decreasingCount++;
      }
    }

    // 判断趋势
    if (increasingCount >= 2) {
      return 'increasing';
    } else if (decreasingCount >= 2) {
      return 'decreasing';
    } else {
      // 如果加速度变化不明显，检查加速度本身的符号
      const avgAccel = accelerations.reduce((sum, a) => sum + a, 0) / accelerations.length;
      if (avgAccel > 10) {
        return 'increasing';
      } else if (avgAccel < -10) {
        return 'decreasing';
      } else {
        return 'stable';
      }
    }
  }

  /**
   * 预测爆发点
   */
  private predictBurstPoint(
    timeline: VelocityTimePoint[],
    currentAcceleration: number
  ): { predictedBurstTime?: string; burstProbability: number } {
    if (timeline.length < 3) {
      return { burstProbability: 0 };
    }

    // 获取所有加速度（不包括第一个，因为第一个总是0）
    const accelerations = timeline
      .map((p) => p.acceleration)
      .slice(1);

    if (accelerations.length < 2) {
      return { burstProbability: 0 };
    }

    // 计算加速度的移动平均（窗口=3或全部，取较小值）
    const windowSize = Math.min(3, accelerations.length);
    const recentAccelerations = accelerations.slice(-windowSize);
    const avgAcceleration =
      recentAccelerations.reduce((sum, a) => sum + a, 0) /
      recentAccelerations.length;

    // 检测持续上升
    let increasingCount = 0;
    for (let i = 1; i < recentAccelerations.length; i++) {
      if (recentAccelerations[i]! > recentAccelerations[i - 1]!) {
        increasingCount++;
      }
    }

    // 计算爆发概率
    let burstProbability = 0;
    if (increasingCount >= windowSize - 1 && avgAcceleration > 0) {
      burstProbability = Math.min(1.0, avgAcceleration / 100);
    }

    // 预测爆发时间
    let predictedBurstTime: string | undefined;
    if (burstProbability > 0.5) {
      const velocities = timeline.map((p) => p.velocity);
      const peakVelocity = Math.max(...velocities);
      const currentVelocity = velocities[velocities.length - 1]!;

      // 使用当前加速度（不包括0）来预测
      const validAcceleration = currentAcceleration > 0 ? currentAcceleration : avgAcceleration;

      if (validAcceleration > 0 && peakVelocity > currentVelocity) {
        const hoursToPeak = (peakVelocity - currentVelocity) / validAcceleration;
        const burstTime = new Date(timeline[timeline.length - 1]!.timestamp);
        burstTime.setHours(burstTime.getHours() + hoursToPeak);
        predictedBurstTime = burstTime.toISOString();
      }
    }

    return { predictedBurstTime, burstProbability };
  }

  /**
   * 识别传播阶段
   */
  private identifyPhase(
    velocity: number,
    avgAcceleration: number
  ): 'initial' | 'growth' | 'peak' | 'decline' | 'stable' {
    // initial: 速度很低
    if (velocity < 10) {
      return 'initial';
    }

    // growth: 加速度显著上升
    if (avgAcceleration > 50) {
      return 'growth';
    }

    // peak: 高速度且加速度稳定
    if (velocity > 200 && Math.abs(avgAcceleration) < 30) {
      return 'peak';
    }

    // decline: 加速度显著下降
    if (avgAcceleration < -50) {
      return 'decline';
    }

    // stable: 其他情况
    return 'stable';
  }

  /**
   * 识别阶段开始时间
   */
  private identifyPhaseStartTime(
    timeline: VelocityTimePoint[],
    currentPhase: string
  ): string {
    if (timeline.length === 0) {
      return new Date().toISOString();
    }

    // 从后往前找第一个不符合当前阶段的时间点
    for (let i = timeline.length - 1; i >= 0; i--) {
      const point = timeline[i]!;
      const accelerations = timeline.slice(0, i + 1).map((p) => p.acceleration);
      const avgAcceleration =
        accelerations.length > 0
          ? accelerations.reduce((sum, a) => sum + a, 0) / accelerations.length
          : 0;

      const phase = this.identifyPhase(point.velocity, avgAcceleration);

      if (phase !== currentPhase) {
        // 返回下一个时间点作为阶段开始时间
        if (i + 1 < timeline.length) {
          return timeline[i + 1]!.timestamp;
        }
        break;
      }
    }

    // 如果没找到，返回第一个时间点
    return timeline[0]!.timestamp;
  }

  /**
   * 返回默认分析结果
   */
  private getDefaultAnalysis(
    eventId: string
  ): PropagationVelocityAnalysis {
    return {
      currentVelocity: 0,
      peakVelocity: 0,
      avgVelocity: 0,
      acceleration: 0,
      accelerationTrend: 'stable',
      velocityTimeline: [],
      burstProbability: 0,
      currentPhase: 'initial',
      phaseStartTime: new Date().toISOString(),
      eventId,
      calculatedAt: new Date().toISOString(),
    };
  }
}
