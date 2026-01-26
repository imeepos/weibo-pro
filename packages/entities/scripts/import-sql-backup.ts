import "reflect-metadata";
import 'dotenv/config';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { DataSource } from 'typeorm';
import { useDataSource } from "../src/utils";

// 导入所有实体以注册元数据
import '@sker/entities';

// 加载 packages/entities/.env 文件
const envPath = resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

/**
 * 从 SQL 文件导入数据到数据库
 *
 * 用法：
 *   npm run import-sql-backup
 *   或
 *   tsx scripts/import-sql-backup.ts
 */
async function importSqlBackup() {
  console.log('='.repeat(80));
  console.log('从 SQL 备份文件导入数据');
  console.log('='.repeat(80));

  const ds = await useDataSource();

  console.log('\n请在 5 秒内按 Ctrl+C 取消操作...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const sqlFilePath = resolve(__dirname, 'event_hourly_statistics_202601261502.sql');

    console.log(`📖 读取 SQL 文件: ${sqlFilePath}`);
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');

    console.log('🚀 开始执行 SQL 导入...');

    // 分割 SQL 语句并执行
    const statements = sqlContent.split(/;\s*(?=(?:INSERT\s+INTO))/gi).filter(s => s.trim());

    let executedCount = 0;
    for (const statement of statements) {
      if (statement.trim()) {
        await queryRunner.query(statement);
        executedCount++;
        if (executedCount % 100 === 0) {
          console.log(`  进度: 已执行 ${executedCount} 条语句`);
        }
      }
    }

    console.log(`✅ SQL 导入完成！共执行 ${executedCount} 条语句`);

    // 验证数据
    const [countResult] = await queryRunner.query(`SELECT COUNT(*) as count FROM event_hourly_statistics`);
    console.log(`📊 当前数据库记录数: ${countResult.count}`);

    await queryRunner.commitTransaction();
    console.log('✅ 数据导入成功完成！');

  } catch (error) {
    console.error('❌ 导入失败，回滚事务:', error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

importSqlBackup().catch(console.error);
