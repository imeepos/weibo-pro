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
        1 AS sentiment_neutral
      FROM weibo_posts
      WHERE event_id IS NOT NULL
        AND created_at IS NOT NULL
        AND deleted_at IS NULL
      GROUP BY event_id, year, month, day, hour
      ORDER BY event_id, year, month, day, hour
    `);
    console.log('✓ 已插入帖子统计记录');

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
