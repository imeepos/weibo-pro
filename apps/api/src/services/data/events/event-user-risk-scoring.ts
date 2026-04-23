import type { EventAbnormalUser, EventUserAbnormalSignal } from './types';

interface RiskInputPost {
  createdAt: string;
  text: string;
  source: string;
  repostsCount: number;
  commentsCount: number;
  attitudesCount: number;
}

interface RiskInputSentiment {
  overall: 'positive' | 'negative' | 'neutral';
  positiveProb: number;
  negativeProb: number;
  neutralProb: number;
}

interface EventUserRiskInput {
  userId: string;
  screenName: string;
  followers: number;
  verified: boolean;
  location: string;
  posts: RiskInputPost[];
  sentiments: RiskInputSentiment[];
}

const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3 } as const;

export function buildEventUserRiskRecord(input: EventUserRiskInput): EventAbnormalUser {
  const abnormalSignals: EventUserAbnormalSignal[] = [];
  const postTimes = input.posts.map((post) => new Date(post.createdAt));
  const nightPosts = postTimes.filter((time) => time.getUTCHours() < 6).length;
  const nightPostRatio = input.posts.length > 0 ? nightPosts / input.posts.length : 0;

  if (nightPostRatio > 0.3) {
    abnormalSignals.push({
      type: 'night_activity',
      severity: 'medium',
      description: `凌晨发帖占比 ${(nightPostRatio * 100).toFixed(1)}%`,
      value: Number(nightPostRatio.toFixed(2)),
    });
  }

  const intervals: number[] = [];
  for (let index = 1; index < postTimes.length; index++) {
    intervals.push((postTimes[index]!.getTime() - postTimes[index - 1]!.getTime()) / 1000 / 60);
  }

  const avgInterval = intervals.length
    ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length
    : 0;
  const intervalStdDev = calculateStdDev(intervals);
  if (intervals.length >= 2 && avgInterval > 0 && intervalStdDev < avgInterval * 0.3) {
    abnormalSignals.push({
      type: 'regular_interval',
      severity: 'high',
      description: `发帖间隔标准差 ${intervalStdDev.toFixed(1)} 分钟`,
      value: { avg: Number(avgInterval.toFixed(1)), stdDev: Number(intervalStdDev.toFixed(1)) },
    });
  }

  const textSimilarity = calculateTextSimilarity(input.posts.map((post) => post.text));
  if (textSimilarity > 0.7) {
    abnormalSignals.push({
      type: 'high_similarity',
      severity: 'high',
      description: `文本相似度 ${(textSimilarity * 100).toFixed(1)}%`,
      value: Number(textSimilarity.toFixed(2)),
    });
  }

  const avgInteractions = input.posts.length
    ? input.posts.reduce(
        (sum, post) => sum + post.repostsCount + post.commentsCount + post.attitudesCount,
        0,
      ) / input.posts.length
    : 0;
  if (avgInteractions < 1 && input.posts.length >= 3) {
    abnormalSignals.push({
      type: 'low_interaction',
      severity: 'low',
      description: `平均互动量 ${avgInteractions.toFixed(2)}`,
      value: Number(avgInteractions.toFixed(2)),
    });
  }

  const negativeSentiments = input.sentiments.filter((item) => item.overall === 'negative').length;
  const negativeRatio = input.sentiments.length > 0 ? negativeSentiments / input.sentiments.length : 0;
  if (negativeRatio > 0.85) {
    abnormalSignals.push({
      type: 'extreme_sentiment',
      severity: 'medium',
      description: `负面情绪占比 ${(negativeRatio * 100).toFixed(1)}%`,
      value: Number(negativeRatio.toFixed(2)),
    });
  }

  const totalScore = abnormalSignals.reduce((sum, signal) => sum + SEVERITY_WEIGHT[signal.severity], 0);
  const riskScore = Math.min(100, Math.round((totalScore / 10) * 100));
  const riskLevel = riskScore >= 61 ? 'high' : riskScore >= 31 ? 'medium' : 'low';
  const isAbnormal = riskLevel !== 'low';

  let accountType: EventAbnormalUser['accountType'] = 'normal';
  if (isAbnormal) {
    const signalTypes = abnormalSignals.map((signal) => signal.type);
    if (signalTypes.includes('regular_interval') && signalTypes.includes('high_similarity')) {
      accountType = 'bot';
    } else if (signalTypes.includes('extreme_sentiment') || signalTypes.includes('burst_posting')) {
      accountType = 'troll';
    } else if (signalTypes.includes('low_interaction')) {
      accountType = 'zombie';
    } else {
      accountType = 'suspicious';
    }
  }

  const lastActive =
    postTimes.length > 0
      ? new Date(Math.max(...postTimes.map((time) => time.getTime()))).toISOString()
      : new Date(0).toISOString();

  return {
    userId: input.userId,
    screenName: input.screenName,
    followers: input.followers,
    verified: input.verified,
    location: input.location,
    postCount: input.posts.length,
    riskLevel,
    riskScore,
    confidence: Number((riskScore / 100).toFixed(2)),
    isAbnormal,
    accountType,
    lastActive,
    summary: isAbnormal ? `检测到 ${abnormalSignals.length} 个异常信号` : '未发现明显异常信号',
    abnormalSignals: abnormalSignals.sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]),
  };
}

function calculateStdDev(values: number[]): number {
  if (!values.length) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateTextSimilarity(texts: string[]): number {
  if (texts.length < 2) return 0;
  const normalized = texts.map((text) => text.replace(/\s+/g, '').trim());
  const unique = new Set(normalized);
  return 1 - (unique.size - 1) / (normalized.length - 1);
}
