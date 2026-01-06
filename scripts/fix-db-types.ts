/**
 * 修复 PostgreSQL 遗留类型冲突
 * 问题：删除表后，相关的自定义类型未被清理
 */

import { Client } from 'pg';

const DATABASE_URL = 'postgresql://postgres:Postgres2025Secure@43.240.223.138:5432/vectordb';

async function fixDatabaseTypes() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('✅ 已连接到数据库');

    // 1. 查看所有自定义类型
    console.log('\n📋 查找遗留的自定义类型...');
    const typesResult = await client.query(`
      SELECT typname, typnamespace, typtype
      FROM pg_type
      WHERE (typname LIKE 'event%' OR typname LIKE 'weibo%')
      AND typtype = 'c'
      ORDER BY typname
    `);

    if (typesResult.rows.length === 0) {
      console.log('✅ 没有发现遗留的自定义类型');
      return;
    }

    console.log(`⚠️  发现 ${typesResult.rows.length} 个遗留类型：`);
    typesResult.rows.forEach((row) => {
      console.log(`  - ${row.typname} (namespace: ${row.typnamespace})`);
    });

    // 2. 删除遗留的类型
    console.log('\n🧹 开始清理遗留类型...');
    for (const row of typesResult.rows) {
      try {
        await client.query(`DROP TYPE IF EXISTS "${row.typname}" CASCADE`);
        console.log(`  ✅ 已删除类型: ${row.typname}`);
      } catch (error) {
        console.error(`  ❌ 删除类型 ${row.typname} 失败:`, error);
      }
    }

    // 3. 验证清理结果
    console.log('\n🔍 验证清理结果...');
    const verifyResult = await client.query(`
      SELECT typname
      FROM pg_type
      WHERE (typname LIKE 'event%' OR typname LIKE 'weibo%')
      AND typtype = 'c'
    `);

    if (verifyResult.rows.length === 0) {
      console.log('✅ 所有遗留类型已清理完成！');
    } else {
      console.log(`⚠️  还有 ${verifyResult.rows.length} 个类型未清理：`);
      verifyResult.rows.forEach((row) => {
        console.log(`  - ${row.typname}`);
      });
    }

  } catch (error) {
    console.error('❌ 执行失败:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 已断开数据库连接');
  }
}

// 执行修复
fixDatabaseTypes()
  .then(() => {
    console.log('\n✨ 修复完成！现在可以重新启动 API 服务了。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 修复失败:', error);
    process.exit(1);
  });
