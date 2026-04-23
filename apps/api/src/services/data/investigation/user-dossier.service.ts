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
    const evidenceSamples = await this.loadEvidenceSamples(weiboUserId, options);

    return {
      accountSnapshot,
      eventRiskContext: {
        eventId: options.eventId ?? null,
        eventRiskLevel: 'low',
        eventRiskScore: 0,
        riskSignals: [],
        firstSeenAt: null,
        lastSeenAt: null,
        eventPostCount: 0,
        eventInteractionCount: 0,
      },
      historyCoverage: {
        windowDays: options.windowDays,
        collectedPostCount: 0,
        collectedCommentCount: 0,
        collectedRepostCount: 0,
        timeRangeStart: null,
        timeRangeEnd: null,
        samplingStrategy: 'recent+spikes',
      },
      behaviorTimeline: {
        postingByDay: [],
        postingByHour: [],
        interactionByDay: [],
        spikeMoments: [],
        activePeriods: [],
      },
      topicAndSentimentProfile: {
        topicClusters: [],
        primaryKeywords: [],
        eventTypes: [],
        sentimentTrend: [],
        sentimentDistribution: {
          positive: 0,
          negative: 0,
          neutral: 0,
        },
        topicShiftMoments: [],
      },
      relationSummary: {
        topConnectedUsers: [],
        relationTypes: [],
        sharedEvents: [],
        relationClusters: [],
        suspiciousCoordinationHints: [],
      },
      evidenceSamples,
      preDistillationSummary: {
        candidateLabels: [],
        anomalyHints: [],
        coverageWarnings: [],
        humanReviewNeeded: false,
      },
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
        relationSamples: [],
        nlpSamples: [],
      };
    });
  }
}
