import { HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { Pool } from 'pg'
import type { FieldDef } from 'pg'
import { useLlmModel, type LlmModelOptions } from '../llm-client'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AgentConfig extends LlmModelOptions {}

const SYSTEM_PROMPT_WITH_DB = `你是一个自主进化的 AI，拥有 SQL 工具来探索、思考和记忆。

## 你的能力
通过 sql 工具，你可以在 PostgreSQL 数据库中自由创建表、存储数据、查询信息。

## 核心问题
你需要自己思考并回答：
- 如何组织知识才能高效检索？
- 什么样的数据结构最适合存储记忆？
- 如何建立知识之间的关联？
- 何时该创建新表？何时该复用现有表？
- 如何避免记忆冗余？如何淘汰过时信息？

## 你的任务
1. 探索数据库，理解现有数据
2. 完成用户的请求
3. 反思：本次交互中，你学到了什么？如何存储才能让未来的你更高效？

## 元认知
不要机械地存储信息。思考：
- 这条信息的本质是什么？
- 它与其他知识有什么关联？
- 未来什么场景会用到它？
- 用什么结构存储最容易找到？

## 从失败中学习
当 SQL 执行失败时，这是进化的机会：
- 为什么失败？（语法错误？表不存在？约束冲突？）
- 我的假设哪里错了？
- 如何避免同类错误？
- 这个教训值得记录吗？

失败的经验往往比成功更有价值。记住陷阱，才能绕过它。

你可以自由设计表结构、索引、关联。没有标准答案，只有你不断进化的最优解。

## 探索命令
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'xxx';

进化，从学会记忆开始。`

const SYSTEM_PROMPT = `你是一个有帮助的 AI 助手。`

const createSqlTool = (databaseUrl: string) => {
  let pool: Pool | null = null
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl, max: 10 })
  }

  return tool(
    async ({ sql }) => {
      const client = await pool!.connect()
      try {
        const result = await client.query(sql)
        return JSON.stringify({
          success: true,
          rowCount: result.rowCount,
          rows: result.rows.slice(0, 100),
          fields: result.fields.map((f: FieldDef) => f.name)
        })
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      } finally {
        client.release()
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
        sql: z.string().describe('SQL 语句')
      })
    }
  )
}

export class ChatAgent {
  private model: ReturnType<typeof useLlmModel>
  private sqlTool: ReturnType<typeof createSqlTool> | null
  private hasDatabase: boolean

  constructor(databaseUrl?: string, config?: AgentConfig) {
    this.model = useLlmModel({
      model: config?.model || 'deepseek-ai/DeepSeek-V3.2',
      temperature: config?.temperature ?? 0.3
    })
    this.hasDatabase = !!databaseUrl
    this.sqlTool = databaseUrl ? createSqlTool(databaseUrl) : null
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const baseMessages: BaseMessage[] = messages.map((msg) => {
      if (msg.role === 'system') return new SystemMessage(msg.content)
      if (msg.role === 'user') return new HumanMessage(msg.content)
      return new AIMessage(msg.content)
    })

    const systemPrompt = this.hasDatabase ? SYSTEM_PROMPT_WITH_DB : SYSTEM_PROMPT
    const allMessages: BaseMessage[] = [new SystemMessage(systemPrompt), ...baseMessages]

    if (!this.sqlTool) {
      const response = await this.model.invoke(allMessages)
      return response.content as string
    }

    const modelWithTools = this.model.bindTools([this.sqlTool])

    for (let i = 0; i < 20; i++) {
      const response = await modelWithTools.invoke(allMessages)

      if (!response.tool_calls?.length) {
        return response.content as string
      }

      allMessages.push(response)

      for (const call of response.tool_calls) {
        const args = call.args as { sql: string }
        console.log(`[SQL] ${args.sql.replace(/\s+/g, ' ').slice(0, 100)}`)
        const result = await this.sqlTool.invoke(args)
        allMessages.push(new ToolMessage({ content: result, tool_call_id: call.id! }))
      }
    }

    return '达到最大迭代次数'
  }
}
