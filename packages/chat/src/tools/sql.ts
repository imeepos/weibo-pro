import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Pool } from 'pg';

export const createSqlTool = (pool: Pool) => {
  return tool(
    async ({ sql }) => {
      const client = await pool.connect();
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

特殊表：
- ai_system_prompt: 存储你的系统提示词（你的核心规则）
  * 通过 UPDATE ai_system_prompt SET content = '...' 可以修改你的行为准则
  * 修改后会在下次会话生效

首次对话时，建议先探索数据库结构。`,
      schema: z.object({
        sql: z.string().describe('SQL 语句'),
      }),
    }
  );
};
