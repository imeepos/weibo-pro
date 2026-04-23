import { Injectable } from '@sker/core';
import { PostNLPResultEntity, WeiboPostEntity, useEntityManager } from '@sker/entities';
import type { EventInstitutionAccount } from './types';

function classifyInstitutionType(
  verifiedType: number | null,
): EventInstitutionAccount['institutionType'] {
  if (verifiedType === 1 || verifiedType === 2) return 'state_media';
  if (verifiedType === 200 || verifiedType === 201) return 'government';
  if (verifiedType === 220) return 'enterprise_org';
  return 'official_other';
}

@Injectable({ providedIn: 'root' })
export class EventInstitutionService {
  async getEventInstitutions(eventId: string): Promise<EventInstitutionAccount[]> {
    return useEntityManager(async (manager) => {
      const rows = await manager
        .getRepository(WeiboPostEntity)
        .createQueryBuilder('post')
        .leftJoin('post.user', 'user')
        .leftJoin(PostNLPResultEntity, 'nlp', 'nlp.post_id = post.id')
        .select('post.user_id', 'userId')
        .addSelect('MAX(user.screen_name)', 'screenName')
        .addSelect('MAX(user.avatar_large)', 'avatar')
        .addSelect('MAX(user.verified_type)', 'verifiedType')
        .addSelect('COUNT(*)', 'postCount')
        .addSelect(
          'SUM(COALESCE(post.comments_count, 0) + COALESCE(post.reposts_count, 0) + COALESCE(post.attitudes_count, 0))',
          'interactionCount',
        )
        .addSelect('MAX(COALESCE(user.followers_count, 0))', 'influenceScore')
        .addSelect(
          'AVG(COALESCE((nlp.sentiment->>\'positive_prob\')::numeric, 0))',
          'sentimentPositive',
        )
        .addSelect(
          'AVG(COALESCE((nlp.sentiment->>\'negative_prob\')::numeric, 0))',
          'sentimentNegative',
        )
        .where('post.event_id = :eventId', { eventId })
        .andWhere('post.deleted_at IS NULL')
        .groupBy('post.user_id')
        .orderBy('interactionCount', 'DESC')
        .limit(20)
        .getRawMany();

      return rows
        .filter((row: any) => Number(row.verifiedType ?? -1) >= 0)
        .map((row: any) => ({
          userId: row.userId,
          screenName: row.screenName || '未知账号',
          avatar: row.avatar || undefined,
          institutionType: classifyInstitutionType(Number(row.verifiedType ?? -1)),
          verified: Number(row.verifiedType ?? -1) >= 0,
          verifiedType: String(row.verifiedType ?? ''),
          postCount: Number(row.postCount || 0),
          interactionCount: Number(row.interactionCount || 0),
          influenceScore: Number(row.influenceScore || 0),
          sentimentTilt:
            Number(row.sentimentNegative || 0) - Number(row.sentimentPositive || 0) > 0.2
              ? 'negative'
              : Number(row.sentimentPositive || 0) - Number(row.sentimentNegative || 0) > 0.2
                ? 'positive'
                : 'neutral',
        }));
    });
  }
}
