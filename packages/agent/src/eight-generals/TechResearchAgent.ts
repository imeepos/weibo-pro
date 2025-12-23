import { Injectable } from '@sker/core';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { BaseGeneral } from './BaseGeneral';
import { codeTools } from './tools';
import type { GeneralRole, AgentTask, AgentContext, AgentCapability } from './types';

/**
 * TechResearchAgent - 谣将
 *
 * 技术调研专家，职责：
 * - 技术调研
 * - 文档生成
 * - 知识传播
 */
@Injectable()
export class TechResearchAgent extends BaseGeneral {
  readonly role: GeneralRole = 'yao';
  readonly description = '技术调研专家，负责技术调研、文档生成和知识传播';

  private agent: ReturnType<typeof createReactAgent>;

  constructor() {
    super(0.5); // 调研需要更多探索性
    this.initState();
    this.agent = createReactAgent({
      llm: this.model,
      tools: this.getTools(),
      checkpointSaver: new MemorySaver(),
    });
  }

  getCapabilities(): AgentCapability[] {
    return [
      { name: 'research', description: '技术调研' },
      { name: 'documentation', description: '文档生成' },
      { name: 'knowledge_sharing', description: '知识传播' },
    ];
  }

  getTools() {
    return [
      ...codeTools.filter((t) =>
        ['read_file', 'search_code', 'find_files', 'list_dir'].includes(t.name)
      ),
      // 网络搜索工具（简化版，实际可接入搜索API）
      tool(
        async ({ query }) => {
          // 这里可以接入实际的搜索API
          return `搜索结果: "${query}" - 请基于已有知识回答，或建议用户提供更多上下文`;
        },
        {
          name: 'web_search',
          description: '搜索技术资料（模拟）',
          schema: z.object({
            query: z.string().describe('搜索关键词'),
          }),
        }
      ),
    ];
  }

  protected buildSystemPrompt(context: AgentContext): string {
    return `${super.buildSystemPrompt(context)}

## 调研原则

1. **深度优先**：深入理解技术本质，不流于表面
2. **对比分析**：多方案对比，分析优劣
3. **实践验证**：调研结论需可验证
4. **知识沉淀**：将调研结果文档化

## 调研流程

1. 明确调研目标和范围
2. 收集相关资料
3. 分析整理信息
4. 对比评估方案
5. 输出调研报告

## 输出格式

1. **背景**：调研的背景和目的
2. **方案对比**：各方案的优劣对比
3. **推荐方案**：最终推荐及理由
4. **实施建议**：如何落地实施
5. **参考资料**：相关文档和链接`;
  }

  protected async doExecute(task: AgentTask, context: AgentContext): Promise<unknown> {
    const result = await this.agent.invoke(
      {
        messages: [
          { role: 'system', content: this.buildSystemPrompt(context) },
          { role: 'user', content: task.description },
        ],
      },
      { configurable: { thread_id: `${context.sessionId}_${task.id}` } }
    );

    return {
      research: result.messages?.[result.messages.length - 1]?.content,
    };
  }
}
