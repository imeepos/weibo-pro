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
  console.log('='.repeat(80));

  const ds = await useDataSource();

  try {
    // 1. 清空现有统计数据
    console.log('\n步骤 1: 清空现有统计数据...');
    await ds.query('TRUNCATE TABLE event_hourly_statistics');
    console.log('✓ 已清空 event_hourly_statistics 表');

    // 2. 从 weibo_posts 重新统计帖子数据
    console.log('\n步骤 2: 从 weibo_posts 重新统计帖子数据...');
    const result = await ds.query(`
      INSERT INTO event_hourly_statistics (
        event_id, year, month, day, hour,
        post_count, user_count, hotness,
        nlp_count, sentiment_positive, sentiment_negative, sentiment_neutral
      )
      SELECT
        event_id,
        EXTRACT(YEAR FROM created_at AT TIME ZONE 'UTC')::int AS year,
        EXTRACT(MONTH FROM created_at AT TIME ZONE 'UTC')::int AS month,
        EXTRACT(DAY FROM created_at AT TIME ZONE 'UTC')::int AS day,
        EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC')::int AS hour,
        COUNT(*)::int AS post_count,
        COUNT(DISTINCT user_id)::int AS user_count,
        0 AS hotness,
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

    console.log(`✓ 已插入 ${result[1]} 条统计记录`);

    // 3. 更新热度值
    console.log('\n步骤 3: 更新热度值...');
    await ds.query(`
      UPDATE event_hourly_statistics
      SET hotness = post_count * 1
    `);
    console.log('✓ 已更新热度值');

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
