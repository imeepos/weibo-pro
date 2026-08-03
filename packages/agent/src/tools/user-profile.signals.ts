import type { PostNLPResultEntity } from '@sker/entities';
import type { UserPost } from './user-profile.queries';
import { calculateStdDev, calculateTextSimilarity, extractSource } from './user-profile.analysis';

/**
 * 异常信号结构
 */
export interface AbnormalSignal {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  value: any;
}

/** 检测用户的异常行为信号（AI账号/水军/机器人） */
export function detectAbnormalSignals(
  posts: UserPost[],
  nlpResults: PostNLPResultEntity[]
): AbnormalSignal[] {
  const abnormalSignals: AbnormalSignal[] = [];

  // 信号1: 时间行为异常
  const postTimes = posts.map((p) => new Date(p.created_at));
  const hourDistribution = new Array(24).fill(0);
  postTimes.forEach((time) => {
    hourDistribution[time.getHours()]++;
  });

  const nightPosts = hourDistribution.slice(0, 6).reduce((a, b) => a + b, 0);
  const nightPostRatio = nightPosts / posts.length;

  if (nightPostRatio > 0.3) {
    abnormalSignals.push({
      type: 'night_activity',
      severity: 'medium',
      description: `凌晨(0-6点)活跃度异常：${(nightPostRatio * 100).toFixed(1)}% 的帖子发布于凌晨`,
      value: nightPostRatio,
    });
  }

  // 计算发帖间隔
  const intervals: number[] = [];
  for (let i = 1; i < postTimes.length; i++) {
    const interval =
      (postTimes[i - 1]!.getTime() - postTimes[i]!.getTime()) / 1000 / 60;
    intervals.push(interval);
  }

  const intervalStdDev = calculateStdDev(intervals);
  const avgInterval =
    intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;

  if (intervalStdDev < avgInterval * 0.3 && intervals.length > 10) {
    abnormalSignals.push({
      type: 'regular_interval',
      severity: 'high',
      description: `发帖间隔高度规律（标准差 ${intervalStdDev.toFixed(1)}分钟，平均间隔 ${avgInterval.toFixed(1)}分钟），疑似定时任务`,
      value: { stdDev: intervalStdDev, avg: avgInterval },
    });
  }

  // 信号2: 短时间爆发式发帖
  const recentHourPosts = posts.filter(
    (p) => new Date(p.created_at).getTime() > Date.now() - 60 * 60 * 1000
  ).length;

  if (recentHourPosts > 20) {
    abnormalSignals.push({
      type: 'burst_posting',
      severity: 'high',
      description: `1小时内发帖 ${recentHourPosts} 条，疑似爆发式刷屏`,
      value: recentHourPosts,
    });
  }

  // 信号3: 文本高度相似
  const texts = posts.slice(0, 50).map((p) => p.text);
  const textSimilarity = calculateTextSimilarity(texts);

  if (textSimilarity > 0.7) {
    abnormalSignals.push({
      type: 'high_similarity',
      severity: 'high',
      description: `文本相似度 ${(textSimilarity * 100).toFixed(1)}%，疑似复制粘贴或模板化`,
      value: textSimilarity,
    });
  }

  // 信号4: 情感极端化
  if (nlpResults.length > 10) {
    const sentiments = nlpResults.map((r) => r.sentiment.overall);
    const positiveCount = sentiments.filter((s) => s === 'positive').length;
    const negativeCount = sentiments.filter((s) => s === 'negative').length;
    const extremeRatio =
      Math.max(positiveCount, negativeCount) / sentiments.length;

    if (extremeRatio > 0.85) {
      abnormalSignals.push({
        type: 'extreme_sentiment',
        severity: 'medium',
        description: `情感极端化：${(extremeRatio * 100).toFixed(1)}% 的帖子为${positiveCount > negativeCount ? '正面' : '负面'}情感，缺乏中性表达`,
        value: {
          extremeRatio,
          dominant: positiveCount > negativeCount ? 'positive' : 'negative',
        },
      });
    }
  }

  // 信号5: 互动异常（互动量极低或极高）
  const avgInteractions =
    posts.reduce(
      (sum, p) =>
        sum + p.reposts_count + p.comments_count + p.attitudes_count,
      0
    ) / posts.length;

  if (avgInteractions < 1 && posts.length > 20) {
    abnormalSignals.push({
      type: 'low_interaction',
      severity: 'low',
      description: `平均互动量极低（${avgInteractions.toFixed(2)}），疑似僵尸账号或被屏蔽`,
      value: avgInteractions,
    });
  }

  // 信号6: 单一设备来源
  const sourceCounts = new Map<string, number>();
  posts.forEach((p) => {
    const source = extractSource(p.source);
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  });

  const maxSourceCount = Math.max(...Array.from(sourceCounts.values()));
  const singleSourceRatio = maxSourceCount / posts.length;

  if (singleSourceRatio > 0.95 && posts.length > 50) {
    abnormalSignals.push({
      type: 'single_device',
      severity: 'low',
      description: `${(singleSourceRatio * 100).toFixed(1)}% 的帖子来自同一设备，缺乏设备多样性`,
      value: singleSourceRatio,
    });
  }

  return abnormalSignals;
}
