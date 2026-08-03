/**
 * 用户档案(dossier)结果映射模块。
 * 将查询返回的原始行数据转换为对外暴露的领域对象，
 * 不包含任何 SQL，只处理行 -> 领域结构的映射与派生。
 */

import type { UserInvestigationDossier } from '@sker/sdk';
import type { UserDossierAccountSnapshot, UserDossierEvidenceSamples } from './types';
import { deriveActivePeriods } from './user-dossier.utils';

export function mapAccountSnapshot(
  rows: any[],
  weiboUserId: string,
): UserDossierAccountSnapshot {
  const user = rows[0];
  if (!user) {
    return {
      weiboUserId,
      screenName: null,
      displayName: null,
      avatar: null,
      description: null,
      location: null,
      followersCount: 0,
      friendsCount: 0,
      statusesCount: 0,
      verified: false,
      verifiedType: null,
      verifiedReason: null,
      creditScore: null,
      urisk: null,
      createdAt: null,
    };
  }

  return {
    weiboUserId: user.weibo_user_id,
    screenName: user.screen_name,
    displayName: user.name ?? user.screen_name,
    avatar: user.avatar,
    description: user.description,
    location: user.location,
    followersCount: Number(user.followers_count || 0),
    friendsCount: Number(user.friends_count || 0),
    statusesCount: Number(user.statuses_count || 0),
    verified: Boolean(user.verified),
    verifiedType: user.verified_type === null ? null : Number(user.verified_type),
    verifiedReason: user.verified_reason,
    creditScore: user.credit_score === null ? null : Number(user.credit_score),
    urisk: user.urisk === null ? null : Number(user.urisk),
    createdAt: user.created_at ?? null,
  };
}

export function mapEvidenceSamples(
  eventRows: any[],
  historyRows: any[],
  relationRows: any[],
  nlpRows: any[],
): UserDossierEvidenceSamples {
  return {
    eventSamples: eventRows.map((row: any) => ({
      sourceId: row.source_id,
      excerpt: String(row.excerpt || '').slice(0, 140),
      reason: '事件内代表样本',
    })),
    historySamples: historyRows.map((row: any) => ({
      sourceId: row.source_id,
      excerpt: String(row.excerpt || '').slice(0, 140),
      reason: '主页历史样本',
    })),
    relationSamples: relationRows.map((row: any) => ({
      sourceId: row.source_id,
      excerpt: `${row.relation_type} · 权重 ${row.total_weight}`,
      reason: '关系强连接样本',
    })),
    nlpSamples: nlpRows.map((row: any) => ({
      sourceId: row.source_id,
      excerpt: `${String(row.excerpt || '').slice(0, 100)} · 情绪 ${row.overall ?? 'unknown'}`,
      reason: 'NLP 语义样本',
    })),
  };
}

export function buildEmptyEventRiskContext(): UserInvestigationDossier['eventRiskContext'] {
  return {
    eventId: null,
    eventRiskLevel: 'low',
    eventRiskScore: 0,
    riskSignals: [],
    firstSeenAt: null,
    lastSeenAt: null,
    eventPostCount: 0,
    eventInteractionCount: 0,
  };
}

export function mapEventRiskContext(
  rows: any[],
  eventId: string,
): UserInvestigationDossier['eventRiskContext'] {
  const row = rows[0] ?? {};
  const analyzedCount = Number(row.analyzed_count || 0);
  const negativeCount = Number(row.negative_count || 0);
  const riskScore = analyzedCount > 0
    ? Math.min(100, Math.round((negativeCount / analyzedCount) * 100))
    : 0;

  return {
    eventId,
    eventRiskLevel: riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
    eventRiskScore: riskScore,
    riskSignals: riskScore >= 60 ? [{ type: 'negative_ratio', label: '高负向占比', score: riskScore }] : [],
    firstSeenAt: row.first_seen_at ? new Date(row.first_seen_at).toISOString() : null,
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
    eventPostCount: Number(row.post_count || 0),
    eventInteractionCount: Number(row.interaction_count || 0),
  };
}

export function mapHistoryCoverage(
  rows: any[],
  windowDays: number,
): UserInvestigationDossier['historyCoverage'] {
  const row = rows[0] ?? {};
  return {
    windowDays,
    collectedPostCount: Number(row.post_count || 0),
    collectedCommentCount: 0,
    collectedRepostCount: 0,
    timeRangeStart: row.start_at ? new Date(row.start_at).toISOString() : null,
    timeRangeEnd: row.end_at ? new Date(row.end_at).toISOString() : null,
    samplingStrategy: 'recent+spikes',
  };
}

export function mapBehaviorTimeline(
  postingByDayRows: any[],
  postingByHourRows: any[],
  interactionByDayRows: any[],
): UserInvestigationDossier['behaviorTimeline'] {
  const spikes = [...interactionByDayRows]
    .sort((a: any, b: any) => Number(b.count || 0) - Number(a.count || 0))
    .slice(0, 3)
    .map((row: any) => ({
      timestamp: row.day ? new Date(row.day).toISOString() : '',
      reason: `日互动峰值 ${row.count}`,
    }));

  const activePeriods = deriveActivePeriods(
    postingByHourRows.map((row: any) => ({
      hour: Number(row.hour),
      count: Number(row.count || 0),
    })),
  );

  return {
    postingByDay: postingByDayRows.map((row: any) => ({
      day: row.day ? new Date(row.day).toISOString() : '',
      count: Number(row.count || 0),
    })),
    postingByHour: postingByHourRows.map((row: any) => ({
      hour: Number(row.hour),
      count: Number(row.count || 0),
    })),
    interactionByDay: interactionByDayRows.map((row: any) => ({
      day: row.day ? new Date(row.day).toISOString() : '',
      count: Number(row.count || 0),
    })),
    spikeMoments: spikes,
    activePeriods,
  };
}

export function mapTopicAndSentimentProfile(
  keywordRows: any[],
  eventTypeRows: any[],
  sentimentRows: any[],
): UserInvestigationDossier['topicAndSentimentProfile'] {
  const sentimentDistribution = sentimentRows.reduce(
    (acc: { positive: number; negative: number; neutral: number }, row: any) => ({
      positive: acc.positive + Number(row.positive || 0),
      negative: acc.negative + Number(row.negative || 0),
      neutral: acc.neutral + Number(row.neutral || 0),
    }),
    { positive: 0, negative: 0, neutral: 0 },
  );

  return {
    topicClusters: keywordRows.slice(0, 3).map((row: any) => ({
      label: row.keyword,
      weight: Number(row.total_weight || 0),
      keywords: [row.keyword],
    })),
    primaryKeywords: keywordRows.map((row: any) => row.keyword),
    eventTypes: eventTypeRows.map((row: any) => ({
      type: row.type,
      weight: Number(row.weight || 0),
    })),
    sentimentTrend: sentimentRows.map((row: any) => ({
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : '',
      positive: Number(row.positive || 0),
      negative: Number(row.negative || 0),
      neutral: Number(row.neutral || 0),
    })),
    sentimentDistribution,
    topicShiftMoments: [],
  };
}

export function mapRelationSummary(
  rows: any[],
): UserInvestigationDossier['relationSummary'] {
  return {
    topConnectedUsers: rows.map((row: any) => ({
      userId: row.related_user_id,
      weight: Number(row.total_weight || 0),
      relationTypes: [row.relation_type],
    })),
    relationTypes: rows.reduce((acc: Array<{ type: string; count: number }>, row: any) => {
      const found = acc.find((item) => item.type === row.relation_type);
      if (found) found.count += 1;
      else acc.push({ type: row.relation_type, count: 1 });
      return acc;
    }, []),
    sharedEvents: [],
    relationClusters: rows.length > 0 ? [{
      label: '高频互动群',
      members: rows.slice(0, 3).map((row: any) => row.related_user_id),
    }] : [],
    suspiciousCoordinationHints: rows.length >= 3 ? ['与多个用户存在高频互动，需检查协同传播'] : [],
  };
}
