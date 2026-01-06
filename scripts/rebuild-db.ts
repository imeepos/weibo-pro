/**
 * 完全重建数据库 Schema
 * 一键清理所有残留，让 TypeORM 重新创建
 */

import { Client } from 'pg';

const DATABASE_URL = 'postgresql://postgres:Postgres2025Secure@43.240.223.138:5432/vectordb';

async function rebuildSchema() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🔗 已连接到数据库\n');

    // 一键清理：删除 schema 后重建
    console.log('🧹 删除 public schema（包括所有表、类型、函数）...');
    await client.query('DROP SCHEMA public CASCADE');

    console.log('✨ 创建全新的 public schema...');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO postgres');
    await client.query('GRANT ALL ON SCHEMA public TO public');

    console.log('\n✅ 数据库已完全清理！');
    console.log('💡 现在运行 pnpm dev，TypeORM 会自动创建所有表。\n');

  } finally {
    await client.end();
  }
}

rebuildSchema().catch(console.error);
