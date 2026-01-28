import "reflect-metadata";
import 'dotenv/config';
import { resolve } from 'path';
import '@sker/entities';
import { useDataSource } from "../src/utils";

const envPath = resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

async function fixHotness() {
  console.log('='.repeat(80));
  console.log('修复 event_hourly_statistics 中的 hotness 值');
  console.log('='.repeat(80));

  const ds = await useDataSource();

  try {
    console.log('\n正在更新 hotness 值...');
    console.log('公式: hotness = post_count * 1 + comment_count * 2 + repost_count * 3 + like_count * 0.5');

    const result = await ds.query(`
      UPDATE event_hourly_statistics
      SET hotness = post_count * 1 + comment_count * 2 + repost_count * 3 + like_count * 0.5
    `);

    console.log(`✓ 已更新 hotness 值`);

    console.log('\n' + '='.repeat(80));
    console.log('✓ 修复完成');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n✗ 修复失败:', error);
    throw error;
  } finally {
    await ds.destroy();
  }
}

fixHotness().catch(console.error);
