---
name: langchain-agent
description: 创建 LangChain Agent 和工具，实现自主研究和数据分析功能。当需要构建 AI Agent、定义 LangChain 工具、或实现智能分析时使用。
---

# LangChain Agent 开发

本项目使用 LangChain + LangGraph 构建自主研究 Agent。

## 核心文件

- Agent 实现：`packages/agent/src/ResearchAgent.ts`
- 工具目录：`packages/agent/src/tools/`

## Agent 定义模板

```typescript
import { Injectable, Inject } from '@sker/core';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { InMemoryStore, MemorySaver } from '@langchain/langgraph';

@Injectable()
export class MyAgent {
  private agent: ReturnType<typeof createReactAgent>;

  constructor(@Inject(SomeDependency) private dep: SomeDependency) {
    const model = new ChatOpenAI({
      modelName: 'deepseek-ai/DeepSeek-V3',
      temperature: 0.3,
      apiKey: process.env.OPENAI_API_KEY,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
      },
    });

    const tools = [
      createQueryTool(),
      createAnalyzeTool(this.dep),
    ];

    this.agent = createReactAgent({
      llm: model,
      tools,
      checkpointSaver: new MemorySaver(),
    });
  }

  async run(task: Task): Promise<Result> {
    const result = await this.agent.invoke({
      messages: [
        { role: 'system', content: this.buildSystemPrompt(task) },
        { role: 'user', content: task.query },
      ],
    }, {
      configurable: { thread_id: task.id },
    });

    return this.parseResult(result);
  }

  private buildSystemPrompt(task: Task): string {
    return `你是专业的分析助手。

## 工作流程
1. 首先使用 query_data 工具获取相关数据
2. 使用 analyze_data 工具进行分析
3. 综合分析结果，生成报告

## 输出格式
- 使用 Markdown 格式
- 包含数据支撑
- 给出明确结论`;
  }
}
```

## 工具定义模板

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { useEntityManager, MyEntity } from '@sker/entities';

export const createQueryTool = () =>
  tool(
    async ({ keyword, startDate, endDate, limit }) => {
      return useEntityManager(async (m) => {
        const qb = m
          .getRepository(MyEntity)
          .createQueryBuilder('e');

        if (keyword) {
          qb.andWhere('e.text LIKE :keyword', { keyword: `%${keyword}%` });
        }

        if (startDate) {
          qb.andWhere('e.created_at >= :startDate', { startDate });
        }

        if (endDate) {
          qb.andWhere('e.created_at <= :endDate', { endDate });
        }

        const results = await qb
          .orderBy('e.created_at', 'DESC')
          .take(limit)
          .getMany();

        // 必须返回字符串
        return JSON.stringify(results.map(r => ({
          id: r.id,
          text: r.text,
          created_at: r.created_at,
        })));
      });
    },
    {
      name: 'query_data',
      description: `查询数据库中的数据。
【重要】此工具仅查询已有数据，不进行实时采集。
【参数说明】
- keyword: 搜索关键词
- startDate/endDate: 时间范围
- limit: 返回数量限制`,
      schema: z.object({
        keyword: z.string().optional().describe('搜索关键词'),
        startDate: z.string().optional().describe('开始日期 (ISO 格式)'),
        endDate: z.string().optional().describe('结束日期 (ISO 格式)'),
        limit: z.number().default(100).describe('返回数量'),
      }),
    }
  );
```

## 带依赖的工具

```typescript
export const createAnalyzeTool = (analyzer: NLPAnalyzer) =>
  tool(
    async ({ text }) => {
      const result = await analyzer.analyze(text);
      return JSON.stringify(result);
    },
    {
      name: 'analyze_text',
      description: '对文本进行 NLP 分析，返回情感和关键词',
      schema: z.object({
        text: z.string().describe('要分析的文本'),
      }),
    }
  );
```

## 提示词设计要点

1. **明确工具能力和限制**
2. **提供工作流程建议**
3. **定义输出格式要求**
4. **包含约束条件**

## Zod Schema 定义

```typescript
z.object({
  // 必填字符串
  name: z.string().describe('名称'),

  // 可选字符串
  keyword: z.string().optional().describe('关键词'),

  // 带默认值
  limit: z.number().default(100).describe('数量限制'),

  // 枚举
  orderBy: z.enum(['time_desc', 'time_asc', 'score']).default('time_desc'),

  // 数组
  ids: z.array(z.string()).describe('ID 列表'),
})
```

## 关键要点

1. **工具必须返回字符串（JSON.stringify）**
2. **描述中标注重要约束**
3. **注意 token 限制**
4. **环境变量验证**
5. **捕获并记录 Agent 执行错误**

## 参考实现

- `packages/agent/src/ResearchAgent.ts`
- `packages/agent/src/tools/post-query.tool.ts`
- `packages/agent/src/tools/nlp-analyze.tool.ts`
