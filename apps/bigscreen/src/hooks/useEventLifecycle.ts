import { useMemo } from 'react';

// 生命周期阶段类型
export type LifecyclePhaseName = 'emergence' | 'growth' | 'peak' | 'decline' | 'dormant';

// 单个阶段接口
export interface LifecyclePhase {
  name: LifecyclePhaseName;
  startTime: Date;
  endTime: Date;
  duration: number; // 持续时长（小时）
  avgHotness: number;
  keyMetrics: {
    posts: number;
    users: number;
    sentiment: number;
  };
}

// 生命周期整体接口
export interface EventLifecycle {
  phases: LifecyclePhase[];
  currentPhase: LifecyclePhaseName | '';
  predictedEndTime: Date;
  totalLifespan: number; // 总生命周期（小时）
}

// 小时级统计数据接口
export interface HourlyStatistics {
  year: number;
  month: number;
  day: number;
  hour: number;
  hotness: number;
  post_count: number;
  user_count: number;
  sentiment_positive: number;
}

// 增长率结果接口
interface GrowthRate {
  rate: number;
  isNegative: boolean;
}

/**
 * 计算增长率
 * @param current 当前值
 * @param previous 上一个值
 * @returns 增长率（百分比）
 */
function calculateGrowthRate(current: number, previous: number): GrowthRate {
  if (previous === 0) {
    return { rate: current > 0 ? 100 : 0, isNegative: false };
  }
  const rate = ((current - previous) / previous) * 100;
  return { rate, isNegative: rate < 0 };
}

/**
 * 判断生命周期阶段
 * @param hotness 当前热度
 * @param growthRate 增长率
 * @param previousHotness 上一个热度（用于判断下降）
 * @returns 阶段名称
 */
function determinePhase(
  hotness: number,
  growthRate: GrowthRate,
  previousHotness?: number
): LifecyclePhaseName {
  const { rate, isNegative } = growthRate;

  // 沉寂阶段：热度 < 10, 增长率 < 5%
  if (hotness < 10 && Math.abs(rate) < 5) {
    return 'dormant';
  }

  // 衰退阶段：热度下降 > 20%
  if (previousHotness !== undefined && !isNegative) {
    const declineRate = ((previousHotness - hotness) / previousHotness) * 100;
    if (declineRate > 20) {
      return 'decline';
    }
  } else if (isNegative && Math.abs(rate) > 20) {
    return 'decline';
  }

  // 高峰阶段：热度 > 60, 增长率 < 20%
  if (hotness > 60 && Math.abs(rate) < 20) {
    return 'peak';
  }

  // 增长阶段：热度 20-60, 增长率 > 20%
  if (hotness >= 20 && hotness <= 60 && rate > 20) {
    return 'growth';
  }

  // 萌芽阶段：热度 < 20, 增长率 > 50%
  if (hotness < 20 && rate > 50) {
    return 'emergence';
  }

  // 默认：根据热度值判断
  if (hotness > 60) return 'peak';
  if (hotness >= 20) return 'growth';
  if (hotness >= 10) return 'emergence';
  return 'dormant';
}

/**
 * 构建时间对象
 */
function buildTime(year: number, month: number, day: number, hour: number): Date {
  return new Date(year, month - 1, day, hour);
}

/**
 * 计算阶段的平均热度
 */
function calculateAvgHotness(data: HourlyStatistics[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, d) => acc + d.hotness, 0);
  return sum / data.length;
}

/**
 * 计算阶段的关键指标
 */
function calculateKeyMetrics(data: HourlyStatistics[]): {
  posts: number;
  users: number;
  sentiment: number;
} {
  if (data.length === 0) {
    return { posts: 0, users: 0, sentiment: 0 };
  }

  const totalPosts = data.reduce((acc, d) => acc + d.post_count, 0);
  const totalUsers = data.reduce((acc, d) => acc + d.user_count, 0);
  const avgSentiment = data.reduce((acc, d) => acc + d.sentiment_positive, 0) / data.length;

  return {
    posts: totalPosts,
    users: totalUsers,
    sentiment: avgSentiment,
  };
}

/**
 * 事件生命周期分析 Hook
 * @param hourlyData 小时级统计数据数组
 * @returns 事件生命周期分析结果
 */
export const useEventLifecycle = (
  hourlyData: HourlyStatistics[]
): EventLifecycle => {
  const lifecycle = useMemo<EventLifecycle>(() => {
    // 边界情况：空数据
    if (!hourlyData || hourlyData.length === 0) {
      return {
        phases: [],
        currentPhase: '',
        predictedEndTime: new Date(),
        totalLifespan: 0,
      };
    }

    // 按时间排序数据
    const sortedData = [...hourlyData].sort((a, b) => {
      const timeA = buildTime(a.year, a.month, a.day, a.hour).getTime();
      const timeB = buildTime(b.year, b.month, b.day, b.hour).getTime();
      return timeA - timeB;
    });

    // 判断每个数据点所属的阶段
    const phaseData: Array<{ data: HourlyStatistics; phase: LifecyclePhaseName }> = sortedData.map((d, index) => {
      let growthRate: GrowthRate = { rate: 0, isNegative: false };

      if (index > 0) {
        const prev = sortedData[index - 1];
        growthRate = calculateGrowthRate(d.post_count, prev.post_count);
      }

      const phase = determinePhase(d.hotness, growthRate, index > 0 ? sortedData[index - 1].hotness : undefined);

      return { data: d, phase };
    });

    // 将连续相同阶段的数据点合并为一个阶段
    const phases: LifecyclePhase[] = [];
    let currentPhaseGroup: HourlyStatistics[] = [];
    let currentPhaseName: LifecyclePhaseName | '' = '';

    phaseData.forEach(({ data, phase }, index) => {
      if (currentPhaseName === '') {
        // 第一个数据点
        currentPhaseName = phase;
        currentPhaseGroup.push(data);
      } else if (phase === currentPhaseName) {
        // 相同阶段，添加到当前组
        currentPhaseGroup.push(data);
      } else {
        // 阶段变化，保存当前阶段并开始新阶段
        if (currentPhaseGroup.length > 0) {
          const first = currentPhaseGroup[0];
          const last = currentPhaseGroup[currentPhaseGroup.length - 1];
          phases.push({
            name: currentPhaseName,
            startTime: buildTime(first.year, first.month, first.day, first.hour),
            endTime: buildTime(last.year, last.month, last.day, last.hour),
            duration: currentPhaseGroup.length,
            avgHotness: calculateAvgHotness(currentPhaseGroup),
            keyMetrics: calculateKeyMetrics(currentPhaseGroup),
          });
        }

        currentPhaseName = phase;
        currentPhaseGroup = [data];
      }

      // 最后一个数据点，保存当前阶段
      if (index === phaseData.length - 1 && currentPhaseGroup.length > 0) {
        const first = currentPhaseGroup[0];
        const last = currentPhaseGroup[currentPhaseGroup.length - 1];
        phases.push({
          name: currentPhaseName,
          startTime: buildTime(first.year, first.month, first.day, first.hour),
          endTime: buildTime(last.year, last.month, last.day, last.hour),
          duration: currentPhaseGroup.length,
          avgHotness: calculateAvgHotness(currentPhaseGroup),
          keyMetrics: calculateKeyMetrics(currentPhaseGroup),
        });
      }
    });

    // 确定当前阶段（最后一个阶段）
    const currentPhase = phases.length > 0 ? phases[phases.length - 1].name : '';

    // 计算总生命周期时长
    const totalLifespan = sortedData.length > 0 ? sortedData.length : 0;

    // 预测结束时间
    // 如果当前是衰退或沉寂阶段，预测即将结束
    // 如果是其他阶段，基于平均阶段时长预测
    let predictedEndTime = new Date();
    if (phases.length > 0) {
      const lastPhase = phases[phases.length - 1];
      const avgPhaseDuration = phases.reduce((acc, p) => acc + p.duration, 0) / phases.length;

      if (currentPhase === 'decline' || currentPhase === 'dormant') {
        // 衰退或沉寂阶段，预测在1-2个阶段时长后结束
        predictedEndTime = new Date(lastPhase.endTime.getTime() + avgPhaseDuration * 2 * 60 * 60 * 1000);
      } else {
        // 其他阶段，预测在3-5个阶段时长后结束
        predictedEndTime = new Date(lastPhase.endTime.getTime() + avgPhaseDuration * 4 * 60 * 60 * 1000);
      }
    }

    return {
      phases,
      currentPhase,
      predictedEndTime,
      totalLifespan,
    };
  }, [hourlyData]);

  return lifecycle;
};
