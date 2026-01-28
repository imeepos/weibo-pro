import "reflect-metadata";
import 'dotenv/config';
import { resolve } from 'path';
import '@sker/entities';
import { useDataSource } from "../src/utils";

const envPath = resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const EVENT_ID = '0c10882d-a686-4e45-9377-cb4543beb458';

async function checkTimezone() {
  console.log('检查 weibo_posts 中 created_at 的实际时区');
  console.log('='.repeat(80));

  const ds = await useDataSource();

  const query = `
    SELECT
      id,
      created_at,
      created_at AT TIME ZONE 'UTC' as utc_time,
      created_at AT TIME ZONE 'Asia/Shanghai' as beijing_time,
      EXTRACT(HOUR FROM created_at) as stored_hour,
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') as utc_hour,
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Shanghai') as beijing_hour
    FROM weibo_posts
    WHERE event_id = $1
    ORDER BY created_at DESC
    LIMIT 10;
  `;

  const results = await ds.query(query, [EVENT_ID]);

  console.log('\n最近10条帖子的时间信息:');
  console.log('-'.repeat(120));

  for (const row of results) {
    console.log(`\nID: ${row.id}`);
    console.log(`  stored: ${row.created_at} (hour: ${row.stored_hour})`);
    console.log(`  as UTC: ${row.utc_time} (hour: ${row.utc_hour})`);
    console.log(`  as Beijing: ${row.beijing_time} (hour: ${row.beijing_hour})`);
  }

  await ds.destroy();
}

checkTimezone().catch(console.error);
