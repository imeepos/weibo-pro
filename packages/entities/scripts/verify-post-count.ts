import "reflect-metadata";
import 'dotenv/config';
import { resolve } from 'path';
import '@sker/entities';
import { useDataSource } from "../src/utils";

// 加载 .env 文件
const envPath = resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const EVENT_ID = '0c10882d-a686-4e45-9377-cb4543beb458';

async function verifyPostCount() {
  console.log('='.repeat(80));
  console.log('验证 event_hourly_statistics 中的 post_count 与实际帖子数是否一致');
  console.log(`事件ID: ${EVENT_ID}`);
  console.log('='.repeat(80));

  const ds = await useDataSource();

  const query = `
    WITH event_id_param AS (
        SELECT $1::uuid AS eid
    ),
    stats_data AS (
        SELECT
            year, month, day, hour,
            post_count,
            comment_count,
            repost_count,
            like_count
        FROM event_hourly_statistics, event_id_param
        WHERE event_id = event_id_param.eid
    ),
    actual_posts_utc AS (
        SELECT
            EXTRACT(YEAR FROM created_at)::int AS year,
            EXTRACT(MONTH FROM created_at)::int AS month,
            EXTRACT(DAY FROM created_at)::int AS day,
            EXTRACT(HOUR FROM created_at)::int AS hour,
            COUNT(*) AS actual_count
        FROM weibo_posts, event_id_param
        WHERE event_id = event_id_param.eid
          AND created_at IS NOT NULL
        GROUP BY year, month, day, hour
    ),
    actual_posts_beijing AS (
        SELECT
            EXTRACT(YEAR FROM (created_at - INTERVAL '8 hours'))::int AS year,
            EXTRACT(MONTH FROM (created_at - INTERVAL '8 hours'))::int AS month,
            EXTRACT(DAY FROM (created_at - INTERVAL '8 hours'))::int AS day,
            EXTRACT(HOUR FROM (created_at - INTERVAL '8 hours'))::int AS hour,
            COUNT(*) AS actual_count_beijing
        FROM weibo_posts, event_id_param
        WHERE event_id = event_id_param.eid
          AND created_at IS NOT NULL
        GROUP BY year, month, day, hour
    )
    SELECT
        COALESCE(s.year, au.year, ab.year) AS year,
        COALESCE(s.month, au.month, ab.month) AS month,
        COALESCE(s.day, au.day, ab.day) AS day,
        COALESCE(s.hour, au.hour, ab.hour) AS hour,
        s.post_count AS stats_count,
        au.actual_count AS actual_utc,
        ab.actual_count_beijing AS actual_beijing,
        CASE
            WHEN s.post_count = au.actual_count THEN 'UTC匹配'
            WHEN s.post_count = ab.actual_count_beijing THEN '北京时间匹配'
            WHEN s.post_count IS NULL THEN '统计缺失'
            WHEN au.actual_count IS NULL AND ab.actual_count_beijing IS NULL THEN '帖子缺失'
            ELSE '不匹配'
        END AS status,
        (s.post_count - COALESCE(au.actual_count, 0)) AS diff_utc,
        (s.post_count - COALESCE(ab.actual_count_beijing, 0)) AS diff_beijing
    FROM stats_data s
    FULL OUTER JOIN actual_posts_utc au USING (year, month, day, hour)
    FULL OUTER JOIN actual_posts_beijing ab USING (year, month, day, hour)
    ORDER BY year, month, day, hour;
  `;

  const results = await ds.query(query, [EVENT_ID]);

  console.log('\n结果:');
  console.log('year | month | day | hour | stats_count | actual_utc | actual_beijing | status | diff_utc | diff_beijing');
  console.log('-'.repeat(120));

  let utcMatches = 0;
  let beijingMatches = 0;
  let mismatches = 0;

  for (const row of results) {
    console.log(
      `${row.year} | ${row.month} | ${row.day} | ${row.hour} | ` +
      `${row.stats_count || 'NULL'} | ${row.actual_utc || 'NULL'} | ${row.actual_beijing || 'NULL'} | ` +
      `${row.status} | ${row.diff_utc} | ${row.diff_beijing}`
    );

    if (row.status === 'UTC匹配') utcMatches++;
    else if (row.status === '北京时间匹配') beijingMatches++;
    else if (row.status === '不匹配') mismatches++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('统计摘要:');
  console.log(`总记录数: ${results.length}`);
  console.log(`UTC匹配: ${utcMatches}`);
  console.log(`北京时间匹配: ${beijingMatches}`);
  console.log(`不匹配: ${mismatches}`);
  console.log('='.repeat(80));

  await ds.destroy();
}

verifyPostCount().catch(console.error);
