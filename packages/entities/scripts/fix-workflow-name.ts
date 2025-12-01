/**
 * 迁移脚本: 修复 workflows 表 name 字段 NULL 值问题
 *
 * 问题根源:
 * TypeORM 无法在包含 NULL 值的列上添加 NOT NULL 约束
 *
 * 解决方案:
 * 为所有 NULL 值填充默认值后,再同步 schema
 */
import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

// 手动加载环境变量
function loadEnv() {
  try {
    const envPath = join(__dirname, '../../../.env');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join('=').trim();
        }
      }
    });
  } catch (error) {
    console.error('加载 .env 文件失败:', error);
  }
}

loadEnv();

async function fixWorkflowNameNull() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 环境变量未设置');
  }

  console.log('使用数据库连接:', databaseUrl.replace(/:[^:@]+@/, ':****@'));

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    synchronize: false, // 禁用自动同步,手动执行迁移
  });

  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('数据库连接成功');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // 开启事务
      await queryRunner.startTransaction();

      // 步骤 1: 检查是否存在 workflows 表
      const tableExists = await queryRunner.hasTable('workflows');
      if (!tableExists) {
        console.log('workflows 表不存在,跳过迁移');
        await queryRunner.commitTransaction();
        return;
      }

      // 步骤 2: 检查 name 列是否存在
      const table = await queryRunner.getTable('workflows');
      const nameColumn = table?.columns.find(col => col.name === 'name');

      if (!nameColumn) {
        console.log('name 列不存在,无需迁移');
        await queryRunner.commitTransaction();
        return;
      }

      // 步骤 3: 统计 NULL 值数量
      const result = await queryRunner.query(
        'SELECT COUNT(*) as count FROM workflows WHERE name IS NULL'
      );
      const nullCount = parseInt(result[0].count);
      console.log(`发现 ${nullCount} 条 name 为 NULL 的记录`);

      if (nullCount > 0) {
        // 步骤 4: 填充 NULL 值
        console.log('正在填充 NULL 值...');
        await queryRunner.query(`
          UPDATE workflows
          SET name = COALESCE(name, code, '未命名工作流')
          WHERE name IS NULL
        `);
        console.log(`已成功填充 ${nullCount} 条记录`);

        // 步骤 5: 验证
        const verifyResult = await queryRunner.query(
          'SELECT COUNT(*) as count FROM workflows WHERE name IS NULL'
        );
        const remainingNull = parseInt(verifyResult[0].count);

        if (remainingNull > 0) {
          throw new Error(`迁移失败: 仍有 ${remainingNull} 条 NULL 记录`);
        }
        console.log('验证成功: 所有 NULL 值已填充');
      } else {
        console.log('无需迁移: 不存在 NULL 值');
      }

      // 提交事务
      await queryRunner.commitTransaction();
      console.log('迁移完成,现在可以安全地运行 TypeORM synchronize');

    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// 执行迁移
fixWorkflowNameNull()
  .then(() => {
    console.log('迁移脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  });
