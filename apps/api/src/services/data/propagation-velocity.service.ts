import { Injectable } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { EventHourlyStatisticsEntity } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type {
  PropagationVelocityAnalysis,
  VelocityTimePoint,
} from '@sker/sdk';
import {
  buildVelocityTimeline,
  calculateAcceleration,
  determineAccelerationTrend,
  predictBurstPoint,
  identifyPhase,
  identifyPhaseStartTime,
  getDefaultAnalysis,
} from './propagation-velocity.calculations';

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
          return getDefaultAnalysis(eventId);
        }

        // 按时间排序（确保在mock环境下也能正确排序）
        statistics.sort((a, b) => {
          const timeA = new Date(a.year, a.month - 1, a.day, a.hour).getTime();
          const timeB = new Date(b.year, b.month - 1, b.day, b.hour).getTime();
          return timeA - timeB;
        });

        // 构建时间序列
        const timeline: VelocityTimePoint[] = buildVelocityTimeline(statistics);

        // 计算各项指标
        const velocities = timeline.map((p) => p.velocity);
        const currentVelocity = velocities[velocities.length - 1] || 0;
        const peakVelocity = Math.max(...velocities, 0);
        const avgVelocity =
          velocities.length > 0
            ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length
            : 0;

        // 计算加速度
        const acceleration = calculateAcceleration(timeline);
        const accelerationTrend = determineAccelerationTrend(timeline);

        // 计算平均加速度（用于传播阶段识别）
        const accelerations = timeline.map((p) => p.acceleration);
        const avgAcceleration =
          accelerations.length > 0
            ? accelerations.reduce((sum, a) => sum + a, 0) / accelerations.length
            : 0;

        // 爆发点预测
        const { predictedBurstTime, burstProbability } = predictBurstPoint(
          timeline,
          acceleration
        );

        // 识别传播阶段
        const currentPhase = identifyPhase(
          currentVelocity,
          avgAcceleration
        );

        // 获取阶段开始时间（最近一次阶段变化的时间）
        const phaseStartTime = identifyPhaseStartTime(
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
      return getDefaultAnalysis(eventId);
    }
  }
}
