import { EntityManager } from 'typeorm';
import { UserRelationStatistics, UserRelationType } from '../user-relation-statistics.entity';
import { StatisticsProgress } from '../statistics-progress.entity';

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

    // 从全局进度表获取最后处理的ID
    let progress = await manager.findOne(StatisticsProgress, {
      where: { relationType: UserRelationType.REPOST },
    });

    if (!progress) {
      // 首次运行，创建进度记录
      progress = manager.create(StatisticsProgress, {
        relationType: UserRelationType.REPOST,
        lastProcessedId: '0',
      });
      await manager.save(progress);
    }

    const lastId = progress.lastProcessedId;

    // 分批统计新数据，使用 CTE 获取最大ID
    const result = await manager.query(
      `
      WITH source_data AS (
        SELECT
          (r."user"->>'id')::bigint as source_user_id,
          (r.retweeted_status->'user'->>'id')::bigint as target_user_id,
          r.id,
          r.ingested_at
        FROM weibo_reposts r
        WHERE r.id > $1
          AND r.retweeted_status IS NOT NULL
          AND r."user"->>'id' IS NOT NULL
          AND r.retweeted_status->'user'->>'id' IS NOT NULL
          AND r."user"->>'id' != r.retweeted_status->'user'->>'id'
        ORDER BY r.id ASC
        LIMIT $2
      ),
      aggregated AS (
        SELECT
          source_user_id,
          target_user_id,
          COUNT(*) as weight,
          MIN(ingested_at) as first_interaction_at,
          MAX(ingested_at) as last_interaction_at,
          MAX(id) as last_processed_id
        FROM source_data
        GROUP BY source_user_id, target_user_id
      ),
      upserted AS (
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
          source_user_id,
          target_user_id,
          'repost' as relation_type,
          weight,
          first_interaction_at,
          last_interaction_at,
          last_processed_id,
          NOW() as last_processed_at
        FROM aggregated
        ON CONFLICT (source_user_id, target_user_id, relation_type)
        DO UPDATE SET
          weight = user_relation_statistics.weight + EXCLUDED.weight,
          first_interaction_at = LEAST(user_relation_statistics.first_interaction_at, EXCLUDED.first_interaction_at),
          last_interaction_at = GREATEST(user_relation_statistics.last_interaction_at, EXCLUDED.last_interaction_at),
          last_processed_id = GREATEST(user_relation_statistics.last_processed_id, EXCLUDED.last_processed_id),
          last_processed_at = NOW(),
          updated_at = NOW()
        RETURNING 1
      )
      SELECT
        (SELECT COUNT(*) FROM upserted) as row_count,
        (SELECT MAX(id) FROM source_data) as max_id
    `,[lastId, maxRecords]
    );

    const processedCount = parseInt(result[0]?.row_count || '0');
    const newLastId = result[0]?.max_id;

    // 更新全局进度
    if (processedCount > 0 && newLastId) {
      progress.lastProcessedId = newLastId;
      progress.lastProcessedAt = new Date();
      progress.processedCount = processedCount;
      await manager.save(progress);
    }

    return processedCount;
  }

  /**
   * 增量统计评论关系
   * 优化: 直接使用 reply_to_user_id 字段，无需 JOIN 帖子表
   */
  static async incrementalCommentStats(
    manager: EntityManager,
    options: IncrementalStatsOptions = {}
  ): Promise<number> {
    const { batchSize = 10000, maxRecords = 100000 } = options;

    // 从全局进度表获取最后处理的ID
    let progress = await manager.findOne(StatisticsProgress, {
      where: { relationType: UserRelationType.COMMENT },
    });

    if (!progress) {
      progress = manager.create(StatisticsProgress, {
        relationType: UserRelationType.COMMENT,
        lastProcessedId: '0',
      });
      await manager.save(progress);
    }

    const lastId = progress.lastProcessedId;

    const result = await manager.query(
      `
      WITH source_data AS (
        SELECT
          c.user_id as source_user_id,
          c.reply_to_user_id as target_user_id,
          c.id,
          c.ingested_at
        FROM weibo_comments c
        WHERE c.id > $1
          AND c.reply_to_user_id IS NOT NULL
          AND c.user_id IS NOT NULL
          AND c.user_id != c.reply_to_user_id
        ORDER BY c.id ASC
        LIMIT $2
      ),
      aggregated AS (
        SELECT
          source_user_id,
          target_user_id,
          COUNT(*) as weight,
          MIN(ingested_at) as first_interaction_at,
          MAX(ingested_at) as last_interaction_at,
          MAX(id) as last_processed_id
        FROM source_data
        GROUP BY source_user_id, target_user_id
      ),
      upserted AS (
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
          source_user_id,
          target_user_id,
          'comment' as relation_type,
          weight,
          first_interaction_at,
          last_interaction_at,
          last_processed_id,
          NOW() as last_processed_at
        FROM aggregated
        ON CONFLICT (source_user_id, target_user_id, relation_type)
        DO UPDATE SET
          weight = user_relation_statistics.weight + EXCLUDED.weight,
          first_interaction_at = LEAST(user_relation_statistics.first_interaction_at, EXCLUDED.first_interaction_at),
          last_interaction_at = GREATEST(user_relation_statistics.last_interaction_at, EXCLUDED.last_interaction_at),
          last_processed_id = GREATEST(user_relation_statistics.last_processed_id, EXCLUDED.last_processed_id),
          last_processed_at = NOW(),
          updated_at = NOW()
        RETURNING 1
      )
      SELECT
        (SELECT COUNT(*) FROM upserted) as row_count,
        (SELECT MAX(id) FROM source_data) as max_id
    `,
      [lastId, maxRecords]
    );

    const processedCount = parseInt(result[0]?.row_count || '0');
    const newLastId = result[0]?.max_id;

    // 更新全局进度
    if (processedCount > 0 && newLastId) {
      progress.lastProcessedId = newLastId;
      progress.lastProcessedAt = new Date();
      progress.processedCount = processedCount;
      await manager.save(progress);
    }

    return processedCount;
  }

  /**
   * 增量统计点赞关系
   */
  static async incrementalLikeStats(
    manager: EntityManager,
    options: IncrementalStatsOptions = {}
  ): Promise<number> {
    const { batchSize = 10000, maxRecords = 100000 } = options;

    // 从全局进度表获取最后处理的ID
    let progress = await manager.findOne(StatisticsProgress, {
      where: { relationType: UserRelationType.LIKE },
    });

    if (!progress) {
      progress = manager.create(StatisticsProgress, {
        relationType: UserRelationType.LIKE,
        lastProcessedId: '0',
      });
      await manager.save(progress);
    }

    const lastId = progress.lastProcessedId;

    const result = await manager.query(
      `
      WITH source_data AS (
        SELECT
          l.user_weibo_id::bigint as source_user_id,
          (p."user"->>'id')::bigint as target_user_id,
          l.id::bigint,
          l.created_at
        FROM weibo_likes l
        JOIN weibo_posts p ON l.target_weibo_id::bigint = p.id
        WHERE l.id::bigint > $1
          AND l.user_weibo_id::bigint != (p."user"->>'id')::bigint
          AND p."user"->>'id' IS NOT NULL
        ORDER BY l.id ASC
        LIMIT $2
      ),
      aggregated AS (
        SELECT
          source_user_id,
          target_user_id,
          COUNT(*) as weight,
          MIN(created_at) as first_interaction_at,
          MAX(created_at) as last_interaction_at,
          MAX(id) as last_processed_id
        FROM source_data
        GROUP BY source_user_id, target_user_id
      ),
      upserted AS (
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
          source_user_id,
          target_user_id,
          'like' as relation_type,
          weight,
          first_interaction_at,
          last_interaction_at,
          last_processed_id,
          NOW() as last_processed_at
        FROM aggregated
        ON CONFLICT (source_user_id, target_user_id, relation_type)
        DO UPDATE SET
          weight = user_relation_statistics.weight + EXCLUDED.weight,
          first_interaction_at = LEAST(user_relation_statistics.first_interaction_at, EXCLUDED.first_interaction_at),
          last_interaction_at = GREATEST(user_relation_statistics.last_interaction_at, EXCLUDED.last_interaction_at),
          last_processed_id = GREATEST(user_relation_statistics.last_processed_id, EXCLUDED.last_processed_id),
          last_processed_at = NOW(),
          updated_at = NOW()
        RETURNING 1
      )
      SELECT
        (SELECT COUNT(*) FROM upserted) as row_count,
        (SELECT MAX(id) FROM source_data) as max_id
    `,
      [lastId, maxRecords]
    );

    const processedCount = parseInt(result[0]?.row_count || '0');
    const newLastId = result[0]?.max_id;

    // 更新全局进度
    if (processedCount > 0 && newLastId) {
      progress.lastProcessedId = newLastId;
      progress.lastProcessedAt = new Date();
      progress.processedCount = processedCount;
      await manager.save(progress);
    }

    return processedCount;
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
    // 从全局进度表获取处理进度
    const progressRecords = await manager.find(StatisticsProgress);

    // 从统计表获取汇总信息
    const stats = await manager.query(`
      SELECT
        relation_type,
        COUNT(*) as total_relations,
        SUM(weight) as total_interactions
      FROM user_relation_statistics
      GROUP BY relation_type
    `);

    // 合并进度和统计信息
    return progressRecords.map((progress) => {
      const stat = stats.find((s: any) => s.relation_type === progress.relationType);
      return {
        relationType: progress.relationType,
        lastProcessedId: progress.lastProcessedId,
        lastProcessedAt: progress.lastProcessedAt,
        processedCount: progress.processedCount,
        totalRelations: stat?.total_relations || 0,
        totalInteractions: stat?.total_interactions || 0,
      };
    });
  }
}
