import { Injectable } from '@sker/core';
import { WeiboPostEntity, useEntityManager } from '@sker/entities';
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
        .select('post.user_id', 'userId')
        .addSelect('MAX(post.screen_name)', 'screenName')
        .addSelect('MAX(post.avatar_large)', 'avatar')
        .addSelect('MAX(post.verified_type)', 'verifiedType')
        .addSelect('COUNT(*)', 'postCount')
        .addSelect(
          'SUM(COALESCE(post.comments_count, 0) + COALESCE(post.reposts_count, 0) + COALESCE(post.attitudes_count, 0))',
          'interactionCount',
        )
        .addSelect('MAX(COALESCE(post.followers_count, 0))', 'influenceScore')
        .addSelect('AVG(COALESCE(post.positive, 0))', 'sentimentPositive')
        .addSelect('AVG(COALESCE(post.negative, 0))', 'sentimentNegative')
        .where('post.event_id = :eventId', { eventId })
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
