/**
 * 社区演化分析计算模块
 *
 * 负责整体稳定性指数、关键变化识别、趋势预测以及默认空结果的计算逻辑。
 */
import type {
  CommunityEvolutionAnalysis,
  CommunityTimeSlice,
  EvolutionEvent,
  KeyChange,
  TrendPrediction,
} from '@sker/sdk';
import type { CommunityMatcher } from './community-evolution.matching';

/**
 * 计算整体稳定性指数
 *
 * 基于相邻时间切片的社区匹配率求平均，取值范围 [0, 1]。
 *
 * @param timeSlices 时间切片序列
 * @param matchCommunities 社区匹配函数（通过参数注入以便复用/替换）
 */
export function calculateOverallStability(
  timeSlices: CommunityTimeSlice[],
  matchCommunities: CommunityMatcher
): number {
  if (timeSlices.length < 2) {
    return 1.0;
  }

  let totalStability = 0;
  let totalPairs = 0;

  for (let i = 1; i < timeSlices.length; i++) {
    const prevSlice = timeSlices[i - 1]!;
    const currSlice = timeSlices[i]!;
    const matches = matchCommunities(prevSlice, currSlice);

    const stability = matches.size / prevSlice.communities.length;
    totalStability += stability;
    totalPairs++;
  }

  return totalPairs > 0 ? totalStability / totalPairs : 0;
}

/**
 * 识别关键变化
 *
 * 针对 growth/shrink 事件，提取新增与流失的关键成员。
 */
export function identifyKeyChanges(
  timeSlices: CommunityTimeSlice[],
  events: EvolutionEvent[]
): KeyChange[] {
  const keyChanges: KeyChange[] = [];

  for (const event of events) {
    if (event.type === 'growth' || event.type === 'shrink') {
      const [prevId = '', currId = ''] = event.involvedCommunities;
      const prevSlice = timeSlices.find((s) =>
        s.communities.some((c) => c.id === prevId)
      );
      const currSlice = timeSlices.find((s) =>
        s.communities.some((c) => c.id === currId)
      );

      if (prevSlice && currSlice) {
        const prevComm = prevSlice.communities.find((c) => c.id === prevId);
        const currComm = currSlice.communities.find((c) => c.id === currId);

        if (prevComm && currComm) {
          // 识别关键成员变化
          const prevMembers = new Set(prevComm.members.map((m) => m.userId));
          const currMembers = new Set(currComm.members.map((m) => m.userId));

          const newMembers = [...currMembers].filter((m) => !prevMembers.has(m));
          const lostMembers = [...prevMembers].filter((m) => !currMembers.has(m));

          const keyMembers = [...newMembers.slice(0, 3), ...lostMembers.slice(0, 3)];

          keyChanges.push({
            communityId: currId,
            changeType: event.type,
            beforeSize: prevComm.size,
            afterSize: currComm.size,
            keyMembers,
          });
        }
      }
    }
  }

  return keyChanges;
}

/**
 * 预测社区演化趋势
 *
 * 基于社区数量的一阶差分进行线性预测，并以时间切片数量评估置信度。
 */
export function predictTrend(timeSlices: CommunityTimeSlice[]): TrendPrediction {
  if (timeSlices.length < 2) {
    return {
      predictedCommunityCount: timeSlices[0]?.communities.length || 0,
      predictedModularity: timeSlices[0]?.modularity || 0,
      confidence: 0,
    };
  }

  // 计算社区数量趋势
  const communityCounts = timeSlices.map((s) => s.communities.length);
  const _avgCommunityCount =
    communityCounts.reduce((sum, count) => sum + count, 0) / communityCounts.length;

  // 简单线性预测（此处 timeSlices.length >= 2，索引安全）
  const lastCount = communityCounts[communityCounts.length - 1]!;
  const prevCount = communityCounts[communityCounts.length - 2]!;
  const trend = lastCount - prevCount;
  const predictedCommunityCount = Math.max(0, Math.round(lastCount + trend));

  // 计算模块度趋势
  const modularities = timeSlices.map((s) => s.modularity);
  const avgModularity =
    modularities.reduce((sum, mod) => sum + mod, 0) / modularities.length;
  const predictedModularity = avgModularity;

  // 计算置信度（基于时间切片数量）
  const confidence = Math.min(1, timeSlices.length / 10);

  return {
    predictedCommunityCount,
    predictedModularity,
    confidence,
  };
}

/**
 * 返回默认（空）演化分析结果
 */
export function getDefaultEvolutionAnalysis(): CommunityEvolutionAnalysis {
  return {
    timeSlices: [],
    evolutionEvents: [],
    overallStability: 0,
    keyChanges: [],
    trendPrediction: {
      predictedCommunityCount: 0,
      predictedModularity: 0,
      confidence: 0,
    },
  };
}
