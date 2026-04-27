import { Injectable } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import type { UserInvestigationDossier } from '@sker/sdk';
import type {
  UserDossierAccountSnapshot,
  UserDossierEvidenceSamples,
  UserDossierOptions,
} from './types';

@Injectable({ providedIn: 'root' })
export class UserDossierService {
  async getDossier(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserInvestigationDossier> {
    const accountSnapshot = await this.loadAccountSnapshot(weiboUserId);
    const eventRiskContext = await this.loadEventRiskContext(weiboUserId, options);
    const historyCoverage = await this.loadHistoryCoverage(weiboUserId, options);
    const behaviorTimeline = await this.loadBehaviorTimeline(weiboUserId, options);
    const topicAndSentimentProfile = await this.loadTopicAndSentimentProfile(weiboUserId, options);
    const relationSummary = await this.loadRelationSummary(weiboUserId, options);
    const evidenceSamples = await this.loadEvidenceSamples(weiboUserId, options);
    const preDistillationSummary = await this.buildPreDistillationSummary({
      eventRiskContext,
      historyCoverage,
      topicAndSentimentProfile,
      relationSummary,
      evidenceSamples,
    });

    return {
      accountSnapshot,
      eventRiskContext,
      historyCoverage,
      behaviorTimeline,
      topicAndSentimentProfile,
      relationSummary,
      evidenceSamples,
      preDistillationSummary,
    };
  }

  protected async loadAccountSnapshot(weiboUserId: string): Promise<UserDossierAccountSnapshot> {
    return useEntityManager(async (manager) => {
      const row = await manager.query(
        `
          SELECT
            u.id::text AS weibo_user_id,
            u.screen_name,
            u.name,
            COALESCE(u.avatar_hd, u.avatar_large, u.profile_image_url) AS avatar,
            u.description,
            COALESCE(NULLIF(u.location, ''), NULLIF(u.province, ''), NULLIF(u.city, ''), NULL) AS location,
            COALESCE(u.followers_count, 0) AS followers_count,
            COALESCE(u.friends_count, 0) AS friends_count,
            COALESCE(u.statuses_count, 0) AS statuses_count,
            COALESCE(u.verified, false) AS verified,
            u.verified_type,
            u.verified_reason,
            u.credit_score,
            u.urisk,
            u.created_at
          FROM weibo_users u
          WHERE u.id::text = $1 OR u.idstr = $1
          LIMIT 1
        `,
        [weiboUserId],
      );

      const user = row[0];
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
    });
  }

  protected async loadEvidenceSamples(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserDossierEvidenceSamples> {
    return useEntityManager(async (manager) => {
      const historyRows = await manager.query(
        `
          SELECT p.id::text AS source_id, COALESCE(p.text_raw, p.text, '') AS excerpt
          FROM weibo_posts p
          WHERE p.user_id::text = $1
            AND p.deleted_at IS NULL
          ORDER BY p.created_at DESC NULLS LAST
          LIMIT 5
        `,
        [weiboUserId],
      );

      const eventRows = options.eventId
        ? await manager.query(
            `
              SELECT p.id::text AS source_id, COALESCE(p.text_raw, p.text, '') AS excerpt
              FROM weibo_posts p
              WHERE p.user_id::text = $1
                AND p.event_id = $2
                AND p.deleted_at IS NULL
              ORDER BY p.created_at DESC NULLS LAST
              LIMIT 5
            `,
            [weiboUserId, options.eventId],
          )
        : [];

      const relationRows = await manager.query(
        `
          SELECT
            CASE
              WHEN source_user_id::text = $1 THEN target_user_id::text
              ELSE source_user_id::text
            END AS source_id,
            relation_type,
            SUM(weight) AS total_weight
          FROM user_relation_statistics
          WHERE source_user_id::text = $1
             OR target_user_id::text = $1
          GROUP BY source_id, relation_type
          ORDER BY total_weight DESC
          LIMIT 5
        `,
        [weiboUserId],
      );

      const nlpRows = await manager.query(
        `
          SELECT
            p.id::text AS source_id,
            COALESCE(p.text_raw, p.text, '') AS excerpt,
            nlp.sentiment->>'overall' AS overall
          FROM post_nlp_results nlp
          JOIN weibo_posts p ON p.id = nlp.post_id
          WHERE p.user_id::text = $1
            AND p.deleted_at IS NULL
          ORDER BY p.created_at DESC NULLS LAST
          LIMIT 5
        `,
        [weiboUserId],
      );

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
    });
  }

  protected async loadEventRiskContext(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserInvestigationDossier['eventRiskContext']> {
    return useEntityManager(async (manager) => {
      if (!options.eventId) {
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

      const rows = await manager.query(
        `
          SELECT
            COUNT(*) AS post_count,
            MIN(p.created_at) AS first_seen_at,
            MAX(p.created_at) AS last_seen_at,
            SUM(COALESCE(p.comments_count, 0) + COALESCE(p.reposts_count, 0) + COALESCE(p.attitudes_count, 0)) AS interaction_count,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) AS negative_count,
            COUNT(DISTINCT nlp.id) AS analyzed_count
          FROM weibo_posts p
          LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
          WHERE p.user_id::text = $1
            AND p.event_id = $2
            AND p.deleted_at IS NULL
        `,
        [weiboUserId, options.eventId],
      );

      const row = rows[0] ?? {};
      const analyzedCount = Number(row.analyzed_count || 0);
      const negativeCount = Number(row.negative_count || 0);
      const riskScore = analyzedCount > 0
        ? Math.min(100, Math.round((negativeCount / analyzedCount) * 100))
        : 0;

      return {
        eventId: options.eventId,
        eventRiskLevel: riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
        eventRiskScore: riskScore,
        riskSignals: riskScore >= 60 ? [{ type: 'negative_ratio', label: '高负向占比', score: riskScore }] : [],
        firstSeenAt: row.first_seen_at ? new Date(row.first_seen_at).toISOString() : null,
        lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
        eventPostCount: Number(row.post_count || 0),
        eventInteractionCount: Number(row.interaction_count || 0),
      };
    });
  }

  protected async loadHistoryCoverage(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserInvestigationDossier['historyCoverage']> {
    return useEntityManager(async (manager) => {
      const rows = await manager.query(
        `
          SELECT
            COUNT(*) AS post_count,
            MIN(created_at) AS start_at,
            MAX(created_at) AS end_at
          FROM weibo_posts
          WHERE user_id::text = $1
            AND deleted_at IS NULL
        `,
        [weiboUserId],
      );

      const row = rows[0] ?? {};
      return {
        windowDays: options.windowDays,
        collectedPostCount: Number(row.post_count || 0),
        collectedCommentCount: 0,
        collectedRepostCount: 0,
        timeRangeStart: row.start_at ? new Date(row.start_at).toISOString() : null,
        timeRangeEnd: row.end_at ? new Date(row.end_at).toISOString() : null,
        samplingStrategy: 'recent+spikes',
      };
    });
  }

  protected async loadBehaviorTimeline(
    weiboUserId: string,
    _options: UserDossierOptions,
  ): Promise<UserInvestigationDossier['behaviorTimeline']> {
    return useEntityManager(async (manager) => {
      const postingByDay = await manager.query(
        `
          SELECT
            DATE_TRUNC('day', created_at) AS day,
            COUNT(*) AS count
          FROM weibo_posts
          WHERE user_id::text = $1
            AND deleted_at IS NULL
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY day DESC
          LIMIT 14
        `,
        [weiboUserId],
      );

      const postingByHour = await manager.query(
        `
          SELECT
            EXTRACT(HOUR FROM created_at) AS hour,
            COUNT(*) AS count
          FROM weibo_posts
          WHERE user_id::text = $1
            AND deleted_at IS NULL
          GROUP BY EXTRACT(HOUR FROM created_at)
          ORDER BY hour ASC
        `,
        [weiboUserId],
      );

      const interactionByDay = await manager.query(
        `
          SELECT
            DATE_TRUNC('day', created_at) AS day,
            SUM(COALESCE(comments_count, 0) + COALESCE(reposts_count, 0) + COALESCE(attitudes_count, 0)) AS count
          FROM weibo_posts
          WHERE user_id::text = $1
            AND deleted_at IS NULL
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY day DESC
          LIMIT 14
        `,
        [weiboUserId],
      );

      const spikes = [...interactionByDay]
        .sort((a: any, b: any) => Number(b.count || 0) - Number(a.count || 0))
        .slice(0, 3)
        .map((row: any) => ({
          timestamp: row.day ? new Date(row.day).toISOString() : '',
          reason: `日互动峰值 ${row.count}`,
        }));

      const activePeriods = this.deriveActivePeriods(
        postingByHour.map((row: any) => ({
          hour: Number(row.hour),
          count: Number(row.count || 0),
        })),
      );

      return {
        postingByDay: postingByDay.map((row: any) => ({
          day: row.day ? new Date(row.day).toISOString() : '',
          count: Number(row.count || 0),
        })),
        postingByHour: postingByHour.map((row: any) => ({
          hour: Number(row.hour),
          count: Number(row.count || 0),
        })),
        interactionByDay: interactionByDay.map((row: any) => ({
          day: row.day ? new Date(row.day).toISOString() : '',
          count: Number(row.count || 0),
        })),
        spikeMoments: spikes,
        activePeriods,
      };
    });
  }

  protected async loadTopicAndSentimentProfile(
    weiboUserId: string,
    _options: UserDossierOptions,
  ): Promise<UserInvestigationDossier['topicAndSentimentProfile']> {
    return useEntityManager(async (manager) => {
      const rows = await manager.query(
        `
          SELECT keyword.keyword AS keyword, SUM((keyword.weight)::numeric) AS total_weight
          FROM post_nlp_results nlp
          JOIN weibo_posts p ON p.id = nlp.post_id
          CROSS JOIN LATERAL jsonb_to_recordset(nlp.keywords) AS keyword(keyword text, weight numeric, sentiment text, pos text, count integer)
          WHERE p.user_id::text = $1
            AND p.deleted_at IS NULL
          GROUP BY keyword.keyword
          ORDER BY total_weight DESC
          LIMIT 8
        `,
        [weiboUserId],
      );

      const eventTypeRows = await manager.query(
        `
          SELECT
            nlp.event_type->>'type' AS type,
            COUNT(*) AS weight
          FROM post_nlp_results nlp
          JOIN weibo_posts p ON p.id = nlp.post_id
          WHERE p.user_id::text = $1
            AND p.deleted_at IS NULL
            AND nlp.event_type->>'type' IS NOT NULL
          GROUP BY nlp.event_type->>'type'
          ORDER BY weight DESC
          LIMIT 5
        `,
        [weiboUserId],
      );

      const sentimentRows = await manager.query(
        `
          SELECT
            DATE_TRUNC('day', p.created_at) AS timestamp,
            COUNT(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 END) AS positive,
            COUNT(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 END) AS negative,
            COUNT(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 END) AS neutral
          FROM post_nlp_results nlp
          JOIN weibo_posts p ON p.id = nlp.post_id
          WHERE p.user_id::text = $1
            AND p.deleted_at IS NULL
          GROUP BY DATE_TRUNC('day', p.created_at)
          ORDER BY timestamp DESC
          LIMIT 14
        `,
        [weiboUserId],
      );

      const sentimentDistribution = sentimentRows.reduce(
        (acc: { positive: number; negative: number; neutral: number }, row: any) => ({
          positive: acc.positive + Number(row.positive || 0),
          negative: acc.negative + Number(row.negative || 0),
          neutral: acc.neutral + Number(row.neutral || 0),
        }),
        { positive: 0, negative: 0, neutral: 0 },
      );

      return {
        topicClusters: rows.slice(0, 3).map((row: any) => ({
          label: row.keyword,
          weight: Number(row.total_weight || 0),
          keywords: [row.keyword],
        })),
        primaryKeywords: rows.map((row: any) => row.keyword),
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
    });
  }

  protected async loadRelationSummary(
    weiboUserId: string,
    _options: UserDossierOptions,
  ): Promise<UserInvestigationDossier['relationSummary']> {
    return useEntityManager(async (manager) => {
      const rows = await manager.query(
        `
          SELECT
            CASE
              WHEN source_user_id::text = $1 THEN target_user_id::text
              ELSE source_user_id::text
            END AS related_user_id,
            relation_type,
            SUM(weight) AS total_weight
          FROM user_relation_statistics
          WHERE source_user_id::text = $1
             OR target_user_id::text = $1
          GROUP BY related_user_id, relation_type
          ORDER BY total_weight DESC
          LIMIT 5
        `,
        [weiboUserId],
      );

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
    });
  }

  protected async buildPreDistillationSummary(input: {
    eventRiskContext: UserInvestigationDossier['eventRiskContext'];
    historyCoverage: UserInvestigationDossier['historyCoverage'];
    topicAndSentimentProfile: UserInvestigationDossier['topicAndSentimentProfile'];
    relationSummary: UserInvestigationDossier['relationSummary'];
    evidenceSamples: UserInvestigationDossier['evidenceSamples'];
  }): Promise<UserInvestigationDossier['preDistillationSummary']> {
    return {
      candidateLabels: input.topicAndSentimentProfile.primaryKeywords.slice(0, 3),
      anomalyHints: input.eventRiskContext.eventRiskScore >= 60 ? ['事件内高风险'] : [],
      coverageWarnings: [
        ...(input.historyCoverage.collectedPostCount === 0 ? ['历史帖子样本为空'] : []),
        ...(input.evidenceSamples.eventSamples.length === 0 ? ['事件样本不足，建议人工复核'] : []),
        ...(input.relationSummary.suspiciousCoordinationHints.length > 0 ? ['存在协同传播迹象'] : []),
      ],
      humanReviewNeeded:
        input.evidenceSamples.eventSamples.length === 0 ||
        input.relationSummary.suspiciousCoordinationHints.length > 0,
    };
  }

  private deriveActivePeriods(hourly: Array<{ hour: number; count: number }>): string[] {
    const buckets = [
      { label: '凌晨活跃', start: 0, end: 5 },
      { label: '上午活跃', start: 6, end: 11 },
      { label: '下午活跃', start: 12, end: 17 },
      { label: '夜间活跃', start: 18, end: 23 },
    ];

    return buckets
      .map((bucket) => ({
        label: bucket.label,
        count: hourly
          .filter((item) => item.hour >= bucket.start && item.hour <= bucket.end)
          .reduce((sum, item) => sum + item.count, 0),
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 2)
      .map((item) => item.label);
  }
}
