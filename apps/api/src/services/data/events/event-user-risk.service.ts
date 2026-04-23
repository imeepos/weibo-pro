import { Injectable } from '@sker/core';
import { PostNLPResultEntity, useEntityManager } from '@sker/entities';
import { buildEventUserRiskRecord } from './event-user-risk-scoring';
import type { EventAbnormalUser, EventUserRiskProfile } from './types';

type RiskAggregationInput = Parameters<typeof buildEventUserRiskRecord>[0];

@Injectable({ providedIn: 'root' })
export class EventUserRiskService {
  async getEventRiskProfile(eventId: string): Promise<EventUserRiskProfile> {
    const users = await this.getEventUserRiskRecords(eventId);
    const abnormalUsers = users.filter((user) => user.isAbnormal);
    const signalCount = new Map<string, number>();

    for (const user of abnormalUsers) {
      for (const signal of user.abnormalSignals) {
        signalCount.set(signal.type, (signalCount.get(signal.type) || 0) + 1);
      }
    }

    return {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.postCount > 0).length,
      abnormalUserCount: abnormalUsers.length,
      averageRiskScore: users.length
        ? Number((users.reduce((sum, user) => sum + user.riskScore, 0) / users.length).toFixed(1))
        : 0,
      riskDistribution: {
        low: users.filter((user) => user.riskLevel === 'low').length,
        medium: users.filter((user) => user.riskLevel === 'medium').length,
        high: users.filter((user) => user.riskLevel === 'high').length,
      },
      topSignals: Array.from(signalCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({
          type: type as EventAbnormalUser['abnormalSignals'][number]['type'],
          label: type,
          count,
        })),
      topRiskUsers: [...users]
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 5)
        .map((user) => ({
          userId: user.userId,
          screenName: user.screenName,
          riskLevel: user.riskLevel,
          riskScore: user.riskScore,
        })),
    };
  }

  async getEventAbnormalUsers(eventId: string): Promise<EventAbnormalUser[]> {
    const users = await this.getEventUserRiskRecords(eventId);
    return users
      .filter((user) => user.isAbnormal)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);
  }

  private async getEventUserRiskRecords(eventId: string): Promise<EventAbnormalUser[]> {
    return useEntityManager(async (manager) => {
      const rows = await manager
        .getRepository(PostNLPResultEntity)
        .createQueryBuilder('nlp')
        .leftJoinAndSelect('nlp.post', 'post')
        .leftJoinAndSelect('post.user', 'user')
        .where('nlp.event_id = :eventId', { eventId })
        .andWhere('post.user_id IS NOT NULL')
        .orderBy('post.created_at', 'DESC')
        .getMany();

      const grouped = new Map<string, RiskAggregationInput>();

      for (const row of rows as any[]) {
        const userId = String(row.post?.user_id);
        const current = grouped.get(userId) || {
          userId,
          screenName: row.post?.user?.screen_name || '未知用户',
          followers: Number(row.post?.user?.followers_count || 0),
          verified: Boolean(row.post?.user?.verified),
          location: row.post?.region_name || row.post?.user?.location || '未知',
          posts: [],
          sentiments: [],
        };

        current.posts.push({
          createdAt: new Date(row.post.created_at).toISOString(),
          text: String(row.post.text_raw || ''),
          source: String(row.post.source || ''),
          repostsCount: Number(row.post.reposts_count || 0),
          commentsCount: Number(row.post.comments_count || 0),
          attitudesCount: Number(row.post.attitudes_count || 0),
        });
        current.sentiments.push({
          overall: row.sentiment?.overall || 'neutral',
          positiveProb: Number(row.sentiment?.positive_prob || 0),
          negativeProb: Number(row.sentiment?.negative_prob || 0),
          neutralProb: Number(row.sentiment?.neutral_prob || 0),
        });
        grouped.set(userId, current);
      }

      return Array.from(grouped.values()).map((user) => buildEventUserRiskRecord(user));
    });
  }
}
