import "reflect-metadata";
import 'dotenv/config';
import { resolve } from 'path';
import '@sker/entities';
import { useDataSource } from "../src/utils";

const envPath = resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

async function checkTableSchemas() {
  console.log('='.repeat(80));
  console.log('检查表字段类型');
  console.log('='.repeat(80));

  const ds = await useDataSource();

  try {
    const tables = ['weibo_posts', 'weibo_comments', 'weibo_reposts', 'weibo_likes'];

    for (const table of tables) {
      console.log(`\n表: ${table}`);
      console.log('-'.repeat(80));

      const result = await ds.query(`
        SELECT
          column_name,
          data_type,
          udt_name,
          is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
          AND column_name = 'created_at'
        ORDER BY ordinal_position
      `, [table]);

      if (result.length > 0) {
        for (const col of result) {
          console.log(`  字段名: ${col.column_name}`);
          console.log(`  数据类型: ${col.data_type}`);
          console.log(`  UDT类型: ${col.udt_name}`);
          console.log(`  可为空: ${col.is_nullable}`);
        }
      } else {
        console.log(`  未找到 created_at 字段`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('检查完成');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n✗ 检查失败:', error);
    throw error;
  } finally {
    await ds.destroy();
  }
}

checkTableSchemas().catch(console.error);
