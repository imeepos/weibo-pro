import "reflect-metadata";
import 'dotenv/config';
import { resolve } from 'path';
import '@sker/entities';
import { useDataSource } from "../src/utils";

const envPath = resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

async function recalculateStatistics() {
  console.log('='.repeat(80));
  console.log('重新计算 event_hourly_statistics 统计数据');
  console.log('注意: 仅重新计算帖子数据');
  console.log('');
  console.log('评论/转发/点赞说明:');
  console.log('- 转发(weibo_reposts): created_at 是 timestamptz,可以重新计算');
  console.log('- 点赞(weibo_likes): created_at 是 timestamptz,可以重新计算');
  console.log('- 评论(weibo_comments): created_at 是 varchar,需要特殊处理');
  console.log('  格式: "Wed Jan 28 00:17:41 +0800 2026"');
  console.log('  需要使用: TO_TIMESTAMP(created_at, \'Dy Mon DD HH24:MI:SS TZHTZH YYYY\')');
  console.log('');
  console.log('新数据已自动修复: 所有表都使用 getTimeDimensions() 方法,');
  console.log('会自动使用正确的 UTC 时间维度');
  console.log('='.repeat(80));

  const ds = await useDataSource();

  try {
    // 1. 清空现有统计数据
    console.log('\n步骤 1: 清空现有统计数据...');
    await ds.query('TRUNCATE TABLE event_hourly_statistics');
    console.log('✓ 已清空 event_hourly_statistics 表');

    // 2. 从 weibo_posts 重新统计帖子数据
    console.log('\n步骤 2: 从 weibo_posts 重新统计帖子数据...');
    await ds.query(`
      INSERT INTO event_hourly_statistics (
        event_id, year, month, day, hour,
        post_count, user_count, hotness,
        nlp_count, sentiment_positive, sentiment_negative, sentiment_neutral
      )
      SELECT
        event_id,
        EXTRACT(YEAR FROM created_at)::int AS year,
        EXTRACT(MONTH FROM created_at)::int AS month,
        EXTRACT(DAY FROM created_at)::int AS day,
        EXTRACT(HOUR FROM created_at)::int AS hour,
        COUNT(*)::int AS post_count,
        COUNT(DISTINCT user_id)::int AS user_count,
        COUNT(*)::int AS hotness,
        0 AS nlp_count,
        0 AS sentiment_positive,
        0 AS sentiment_negative,
        0 AS sentiment_neutral
      FROM weibo_posts
      WHERE event_id IS NOT NULL
        AND created_at IS NOT NULL
        AND deleted_at IS NULL
      GROUP BY event_id, year, month, day, hour
      ORDER BY event_id, year, month, day, hour
    `);
    console.log('✓ 已插入帖子统计记录');

    // 3. 从 weibo_reposts 更新转发数据
    console.log('\n步骤 3: 从 weibo_reposts 更新转发数据...');
    await ds.query(`
      UPDATE event_hourly_statistics ehs
      SET repost_count = subquery.repost_count
      FROM (
        SELECT
          p.event_id,
          EXTRACT(YEAR FROM r.created_at)::int AS year,
          EXTRACT(MONTH FROM r.created_at)::int AS month,
          EXTRACT(DAY FROM r.created_at)::int AS day,
          EXTRACT(HOUR FROM r.created_at)::int AS hour,
          COUNT(*)::int AS repost_count
        FROM weibo_reposts r
        JOIN weibo_posts p ON r.post_id = p.id::varchar
        WHERE p.event_id IS NOT NULL
          AND r.created_at IS NOT NULL
          AND p.deleted_at IS NULL
        GROUP BY p.event_id, year, month, day, hour
      ) subquery
      WHERE ehs.event_id = subquery.event_id
        AND ehs.year = subquery.year
        AND ehs.month = subquery.month
        AND ehs.day = subquery.day
        AND ehs.hour = subquery.hour
    `);
    console.log('✓ 已更新转发统计记录');

    // 4. 从 weibo_likes 更新点赞数据
    console.log('\n步骤 4: 从 weibo_likes 更新点赞数据...');
    await ds.query(`
      UPDATE event_hourly_statistics ehs
      SET like_count = subquery.like_count
      FROM (
        SELECT
          p.event_id,
          EXTRACT(YEAR FROM l.created_at)::int AS year,
          EXTRACT(MONTH FROM l.created_at)::int AS month,
          EXTRACT(DAY FROM l.created_at)::int AS day,
          EXTRACT(HOUR FROM l.created_at)::int AS hour,
          COUNT(*)::int AS like_count
        FROM weibo_likes l
        JOIN weibo_posts p ON l.target_weibo_id = p.id::bigint
        WHERE p.event_id IS NOT NULL
          AND l.created_at IS NOT NULL
          AND p.deleted_at IS NULL
        GROUP BY p.event_id, year, month, day, hour
      ) subquery
      WHERE ehs.event_id = subquery.event_id
        AND ehs.year = subquery.year
        AND ehs.month = subquery.month
        AND ehs.day = subquery.day
        AND ehs.hour = subquery.hour
    `);
    console.log('✓ 已更新点赞统计记录');

    // 5. 从 weibo_comments 更新评论数据 (注意: created_at 是 varchar)
    console.log('\n步骤 5: 从 weibo_comments 更新评论数据...');
    await ds.query(`
      UPDATE event_hourly_statistics ehs
      SET comment_count = subquery.comment_count
      FROM (
        SELECT
          p.event_id,
          EXTRACT(YEAR FROM TO_TIMESTAMP(c.created_at, 'Dy Mon DD HH24:MI:SS TZHTZH YYYY'))::int AS year,
          EXTRACT(MONTH FROM TO_TIMESTAMP(c.created_at, 'Dy Mon DD HH24:MI:SS TZHTZH YYYY'))::int AS month,
          EXTRACT(DAY FROM TO_TIMESTAMP(c.created_at, 'Dy Mon DD HH24:MI:SS TZHTZH YYYY'))::int AS day,
          EXTRACT(HOUR FROM TO_TIMESTAMP(c.created_at, 'Dy Mon DD HH24:MI:SS TZHTZH YYYY'))::int AS hour,
          COUNT(*)::int AS comment_count
        FROM weibo_comments c
        JOIN weibo_posts p ON c.post_id = p.id::varchar
        WHERE p.event_id IS NOT NULL
          AND c.created_at IS NOT NULL
          AND p.deleted_at IS NULL
        GROUP BY p.event_id, year, month, day, hour
      ) subquery
      WHERE ehs.event_id = subquery.event_id
        AND ehs.year = subquery.year
        AND ehs.month = subquery.month
        AND ehs.day = subquery.day
        AND ehs.hour = subquery.hour
    `);
    console.log('✓ 已更新评论统计记录');

    // 6. 更新热度值 (使用正确的公式)
    console.log('\n步骤 6: 更新热度值...');
    await ds.query(`
      UPDATE event_hourly_statistics
      SET hotness = post_count * 1 + comment_count * 2 + repost_count * 3 + like_count * 0.5
    `);
    console.log('✓ 已更新热度值');

    // 7. 从 post_nlp_results 更新 NLP 统计数据
    console.log('\n步骤 7: 从 post_nlp_results 更新 NLP 统计数据...');
    await ds.query(`
      UPDATE event_hourly_statistics ehs
      SET
        nlp_count = subquery.nlp_count,
        sentiment_positive = subquery.sentiment_positive,
        sentiment_negative = subquery.sentiment_negative,
        sentiment_neutral = subquery.sentiment_neutral
      FROM (
        SELECT
          p.event_id,
          EXTRACT(YEAR FROM n.created_at)::int AS year,
          EXTRACT(MONTH FROM n.created_at)::int AS month,
          EXTRACT(DAY FROM n.created_at)::int AS day,
          EXTRACT(HOUR FROM n.created_at)::int AS hour,
          COUNT(*)::int AS nlp_count,
          SUM(CASE WHEN n.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END)::int AS sentiment_positive,
          SUM(CASE WHEN n.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END)::int AS sentiment_negative,
          SUM(CASE WHEN n.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END)::int AS sentiment_neutral
        FROM post_nlp_results n
        JOIN weibo_posts p ON n.post_id = p.id
        WHERE p.event_id IS NOT NULL
          AND n.created_at IS NOT NULL
          AND p.deleted_at IS NULL
        GROUP BY p.event_id, year, month, day, hour
      ) subquery
      WHERE ehs.event_id = subquery.event_id
        AND ehs.year = subquery.year
        AND ehs.month = subquery.month
        AND ehs.day = subquery.day
        AND ehs.hour = subquery.hour
    `);
    console.log('✓ 已更新 NLP 统计数据');

    console.log('\n' + '='.repeat(80));
    console.log('✓ 统计数据重新计算完成');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n✗ 重新计算失败:', error);
    throw error;
  } finally {
    await ds.destroy();
  }
}

recalculateStatistics().catch(console.error);
