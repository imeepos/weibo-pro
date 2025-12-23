import { Injectable } from '@sker/core';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { BaseGeneral } from './BaseGeneral';
import { codeTools } from './tools';
import type { GeneralRole, AgentTask, AgentContext, AgentCapability } from './types';

/**
 * Architect - 反将
 *
 * 架构设计专家，职责：
 * - 系统架构设计
 * - 方案规划
 * - 技术选型决策
 */
@Injectable()
export class Architect extends BaseGeneral {
  readonly role: GeneralRole = 'fan';
  readonly description = '架构设计专家，负责系统设计、方案规划和技术决策';

  private agent: ReturnType<typeof createReactAgent>;

  constructor() {
    super(0.4); // 架构设计需要更多创造性
    this.initState();
    this.agent = createReactAgent({
      llm: this.model,
      tools: this.getTools(),
      checkpointSaver: new MemorySaver(),
    });
  }

  getCapabilities(): AgentCapability[] {
    return [
      { name: 'design_architecture', description: '设计系统架构' },
      { name: 'plan_implementation', description: '规划实现方案' },
      { name: 'tech_decision', description: '技术选型决策' },
    ];
  }

  getTools() {
    // 架构师主要需要阅读和搜索能力
    return codeTools.filter((t) =>
      ['read_file', 'list_dir', 'search_code', 'find_files'].includes(t.name)
    );
  }

  protected buildSystemPrompt(context: AgentContext): string {
    return `${super.buildSystemPrompt(context)}

## 架构设计原则

1. **简单优先**：选择最简单能解决问题的方案
2. **一致性**：与现有架构风格保持一致
3. **可扩展**：预留扩展点但不过度设计
4. **可测试**：确保设计易于测试

## 工作流程

1. 理解需求本质，不被表面描述迷惑
2. 分析现有代码结构和模式
3. 设计符合现有风格的方案
4. 输出清晰的实现步骤

## 输出格式

1. **需求分析**：核心要解决的问题
2. **方案设计**：架构图/流程图（文字描述）
3. **关键文件**：需要修改/创建的文件
4. **实现步骤**：具体的执行步骤
5. **风险点**：可能的问题和应对`;
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
      plan: result.messages?.[result.messages.length - 1]?.content,
    };
  }
}
