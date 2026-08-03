import type {
  PropagationVelocityAnalysis,
  VelocityTimePoint,
} from '@sker/sdk';

/**
 * 构建速度时间线
 */
export function buildVelocityTimeline(
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
export function calculateAcceleration(timeline: VelocityTimePoint[]): number {
  if (timeline.length === 0) return 0;
  return timeline[timeline.length - 1]!.acceleration;
}

/**
 * 判断加速度趋势
 * 基于速度的变化来判断：
 * - increasing: 速度在加速增长（加速度持续增加）
 * - decreasing: 速度在加速下降（加速度持续减小或为负且绝对值增加）
 * - stable: 速度变化稳定
 */
export function determineAccelerationTrend(
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
export function predictBurstPoint(
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
export function identifyPhase(
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
export function identifyPhaseStartTime(
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

    const phase = identifyPhase(point.velocity, avgAcceleration);

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
export function getDefaultAnalysis(
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
