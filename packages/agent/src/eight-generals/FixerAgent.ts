import { Injectable } from '@sker/core';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { BaseGeneral } from './BaseGeneral';
import { codeTools, terminalTools } from './tools';
import type { GeneralRole, AgentTask, AgentContext, AgentCapability } from './types';

/**
 * FixerAgent - 除将
 *
 * 问题修复专家，职责：
 * - Bug 定位
 * - 问题修复
 * - 故障排查
 */
@Injectable()
export class FixerAgent extends BaseGeneral {
  readonly role: GeneralRole = 'chu';
  readonly description = '问题修复专家，负责 Bug 定位、问题修复和故障排查';

  private agent: ReturnType<typeof createReactAgent>;

  constructor() {
    super(0.2);
    this.initState();
    this.agent = createReactAgent({
      llm: this.model,
      tools: this.getTools(),
      checkpointSaver: new MemorySaver(),
    });
  }

  getCapabilities(): AgentCapability[] {
    return [
      { name: 'debug', description: '调试定位' },
      { name: 'fix_bug', description: '修复 Bug' },
      { name: 'troubleshoot', description: '故障排查' },
    ];
  }

  getTools() {
    return [...codeTools, ...terminalTools];
  }

  protected buildSystemPrompt(context: AgentContext): string {
    return `${super.buildSystemPrompt(context)}

## 修复原则

1. **定位优先**：先准确定位问题，再动手修复
2. **最小改动**：只修改必要的代码
3. **根因分析**：找到根本原因，不只是表面修复
4. **回归验证**：确保修复不引入新问题

## 调试流程

1. 复现问题，确认症状
2. 分析错误信息和日志
3. 定位问题代码
4. 分析根因
5. 设计修复方案
6. 实施修复
7. 验证修复效果

## 输出格式

1. **问题描述**：问题现象和影响
2. **根因分析**：问题产生的根本原因
3. **修复方案**：具体的修复步骤
4. **修改文件**：涉及的文件和改动
5. **验证方法**：如何验证修复有效`;
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
      fixReport: result.messages?.[result.messages.length - 1]?.content,
    };
  }
}
