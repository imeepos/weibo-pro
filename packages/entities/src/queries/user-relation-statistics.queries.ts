import { EntityManager } from 'typeorm';
import { UserRelationStatistics, UserRelationType } from '../user-relation-statistics.entity';

interface IncrementalStatsOptions {
  batchSize?: number;
  maxRecords?: number;
}

export class UserRelationStatisticsQueries {
  /**
   * 增量统计转发关系
   * 只处理新增的转发记录，避免全量扫描
   */
  static async incrementalRepostStats(
    manager: EntityManager,
    options: IncrementalStatsOptions = {}
  ): Promise<number> {
    const { batchSize = 10000, maxRecords = 100000 } = options;

    // 获取最后处理的ID
    const lastProcessed = await manager
      .createQueryBuilder(UserRelationStatistics, 'stats')
      .where('stats.relationType = :type', { type: UserRelationType.REPOST })
      .orderBy('stats.lastProcessedId', 'DESC')
      .limit(1)
      .getOne();

    const lastId = lastProcessed?.lastProcessedId || '0';

    // 分批统计新数据
    const result = await manager.query(
      `
      INSERT INTO user_relation_statistics (
        source_user_id,
        target_user_id,
        relation_type,
        weight,
        first_interaction_at,
        last_interaction_at,
        last_processed_id,
        last_processed_at
      )
      SELECT
        (r.user->>'id')::bigint as source_user_id,
        (r.retweeted_status->'user'->>'id')::bigint as target_user_id,
        'repost' as relation_type,
        COUNT(*) as weight,
        MIN(r.ingested_at) as first_interaction_at,
        MAX(r.ingested_at) as last_interaction_at,
        MAX(r.id) as last_processed_id,
        NOW() as last_processed_at
      FROM weibo_reposts r
      WHERE r.id > $1
        AND r.retweeted_status IS NOT NULL
        AND r.user->>'id' IS NOT NULL
        AND r.retweeted_status->'user'->>'id' IS NOT NULL
        AND r.user->>'id' != r.retweeted_status->'user'->>'id'
      GROUP BY (r.user->>'id')::bigint, (r.retweeted_status->'user'->>'id')::bigint
      LIMIT $2
      ON CONFLICT (source_user_id, target_user_id, relation_type)
      DO UPDATE SET
        weight = user_relation_statistics.weight + EXCLUDED.weight,
        first_interaction_at = LEAST(user_relation_statistics.first_interaction_at, EXCLUDED.first_interaction_at),
        last_interaction_at = GREATEST(user_relation_statistics.last_interaction_at, EXCLUDED.last_interaction_at),
        last_processed_id = GREATEST(user_relation_statistics.last_processed_id, EXCLUDED.last_processed_id),
        last_processed_at = NOW(),
        updated_at = NOW()
    `,
      [lastId, maxRecords]
    );

    return result.rowCount || 0;
  }

  /**
   * 增量统计评论关系
   */
  static async incrementalCommentStats(
    manager: EntityManager,
    options: IncrementalStatsOptions = {}
  ): Promise<number> {
    const { batchSize = 10000, maxRecords = 100000 } = options;

    const lastProcessed = await manager
      .createQueryBuilder(UserRelationStatistics, 'stats')
      .where('stats.relationType = :type', { type: UserRelationType.COMMENT })
      .orderBy('stats.lastProcessedId', 'DESC')
      .limit(1)
      .getOne();

    const lastId = lastProcessed?.lastProcessedId || '0';

    const result = await manager.query(
      `
      INSERT INTO user_relation_statistics (
        source_user_id,
        target_user_id,
        relation_type,
        weight,
        first_interaction_at,
        last_interaction_at,
        last_processed_id,
        last_processed_at
      )
      SELECT
        (c.user->>'id')::bigint as source_user_id,
        (p.user->>'id')::bigint as target_user_id,
        'comment' as relation_type,
        COUNT(*) as weight,
        MIN(c.ingested_at) as first_interaction_at,
        MAX(c.ingested_at) as last_interaction_at,
        MAX(c.id) as last_processed_id,
        NOW() as last_processed_at
      FROM weibo_comments c
      JOIN weibo_posts p ON c.rootid = p.id
      WHERE c.id > $1
        AND c.user->>'id' IS NOT NULL
        AND p.user->>'id' IS NOT NULL
        AND c.user->>'id' != p.user->>'id'
      GROUP BY (c.user->>'id')::bigint, (p.user->>'id')::bigint
      LIMIT $2
      ON CONFLICT (source_user_id, target_user_id, relation_type)
      DO UPDATE SET
        weight = user_relation_statistics.weight + EXCLUDED.weight,
        first_interaction_at = LEAST(user_relation_statistics.first_interaction_at, EXCLUDED.first_interaction_at),
        last_interaction_at = GREATEST(user_relation_statistics.last_interaction_at, EXCLUDED.last_interaction_at),
        last_processed_id = GREATEST(user_relation_statistics.last_processed_id, EXCLUDED.last_processed_id),
        last_processed_at = NOW(),
        updated_at = NOW()
    `,
      [lastId, maxRecords]
    );

    return result.rowCount || 0;
  }

  /**
   * 增量统计点赞关系
   */
  static async incrementalLikeStats(
    manager: EntityManager,
    options: IncrementalStatsOptions = {}
  ): Promise<number> {
    const { batchSize = 10000, maxRecords = 100000 } = options;

    const lastProcessed = await manager
      .createQueryBuilder(UserRelationStatistics, 'stats')
      .where('stats.relationType = :type', { type: UserRelationType.LIKE })
      .orderBy('stats.lastProcessedId', 'DESC')
      .limit(1)
      .getOne();

    const lastId = lastProcessed?.lastProcessedId || '0';

    const result = await manager.query(
      `
      INSERT INTO user_relation_statistics (
        source_user_id,
        target_user_id,
        relation_type,
        weight,
        first_interaction_at,
        last_interaction_at,
        last_processed_id,
        last_processed_at
      )
      SELECT
        l.user_weibo_id as source_user_id,
        (p.user->>'id')::bigint as target_user_id,
        'like' as relation_type,
        COUNT(*) as weight,
        MIN(l.created_at) as first_interaction_at,
        MAX(l.created_at) as last_interaction_at,
        MAX(l.id) as last_processed_id,
        NOW() as last_processed_at
      FROM weibo_likes l
      JOIN weibo_posts p ON l.target_weibo_id = p.id
      WHERE l.id > $1
        AND l.user_weibo_id != (p.user->>'id')::bigint
        AND p.user->>'id' IS NOT NULL
      GROUP BY l.user_weibo_id, (p.user->>'id')::bigint
      LIMIT $2
      ON CONFLICT (source_user_id, target_user_id, relation_type)
      DO UPDATE SET
        weight = user_relation_statistics.weight + EXCLUDED.weight,
        first_interaction_at = LEAST(user_relation_statistics.first_interaction_at, EXCLUDED.first_interaction_at),
        last_interaction_at = GREATEST(user_relation_statistics.last_interaction_at, EXCLUDED.last_interaction_at),
        last_processed_id = GREATEST(user_relation_statistics.last_processed_id, EXCLUDED.last_processed_id),
        last_processed_at = NOW(),
        updated_at = NOW()
    `,
      [lastId, maxRecords]
    );

    return result.rowCount || 0;
  }

  /**
   * 一次性执行所有增量统计
   */
  static async runIncrementalStats(
    manager: EntityManager,
    options: IncrementalStatsOptions = {}
  ): Promise<{ repost: number; comment: number; like: number }> {
    const repostCount = await this.incrementalRepostStats(manager, options);
    const commentCount = await this.incrementalCommentStats(manager, options);
    const likeCount = await this.incrementalLikeStats(manager, options);

    return {
      repost: repostCount,
      comment: commentCount,
      like: likeCount,
    };
  }

  /**
   * 获取统计进度
   */
  static async getStatisticsProgress(manager: EntityManager) {
    const progress = await manager.query(`
      SELECT
        relation_type,
        COUNT(*) as total_relations,
        SUM(weight) as total_interactions,
        MAX(last_processed_id) as last_processed_id,
        MAX(last_processed_at) as last_processed_at
      FROM user_relation_statistics
      GROUP BY relation_type
    `);

    return progress;
  }
}
