import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Pool } from 'pg';

let pool: Pool | null = null;

export const createSqlTool = (databaseUrl: string) => {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl, max: 10 });
  }

  return tool(
    async ({ sql }) => {
      const client = await pool!.connect();
      try {
        const result = await client.query(sql);
        return JSON.stringify({
          success: true,
          rowCount: result.rowCount,
          rows: result.rows.slice(0, 100),
          fields: result.fields.map((f) => f.name),
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        client.release();
      }
    },
    {
      name: 'sql',
      description: `执行 PostgreSQL 语句。你可以：
- 查询 information_schema.tables 发现所有表
- 查询 information_schema.columns 了解表结构
- 创建表来存储你的记忆和学习成果
- 执行 CRUD 操作管理数据

首次对话时，建议先探索数据库结构。`,
      schema: z.object({
        sql: z.string().describe('SQL 语句'),
      }),
    }
  );
};

export const closeSqlPool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
