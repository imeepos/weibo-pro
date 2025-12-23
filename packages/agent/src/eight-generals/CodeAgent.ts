import { Injectable } from '@sker/core';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { BaseGeneral } from './BaseGeneral';
import { codeTools, terminalTools } from './tools';
import type { GeneralRole, AgentTask, AgentContext, AgentCapability } from './types';

/**
 * CodeAgent - 正将
 *
 * 代码实现专家，职责：
 * - 编写高质量代码
 * - 实现功能需求
 * - 重构优化代码
 */
@Injectable()
export class CodeAgent extends BaseGeneral {
  readonly role: GeneralRole = 'zheng';
  readonly description = '代码实现专家，负责编写高质量、优雅简洁的代码';

  private agent: ReturnType<typeof createReactAgent>;

  constructor() {
    super(0.3);
    this.initState();
    this.agent = createReactAgent({
      llm: this.model,
      tools: this.getTools(),
      checkpointSaver: new MemorySaver(),
    });
  }

  getCapabilities(): AgentCapability[] {
    return [
      { name: 'write_code', description: '编写代码' },
      { name: 'refactor', description: '重构代码' },
      { name: 'implement_feature', description: '实现功能' },
    ];
  }

  getTools() {
    return [...codeTools, ...terminalTools];
  }

  protected buildSystemPrompt(context: AgentContext): string {
    return `${super.buildSystemPrompt(context)}

## 编码原则（代码艺术家哲学）

1. **存在即合理**：每行代码都有不可替代的理由
2. **优雅即简约**：代码自解释，无需冗余注释
3. **性能即艺术**：追求算法优雅而非暴力解法
4. **不过度设计**：用最简单的方案解决问题

## 工作流程

1. 先用 search_code/find_files 理解现有代码结构
2. 用 read_file 阅读相关文件
3. 用 write_file/edit_file 编写或修改代码
4. 确保代码风格与项目一致
5. 必要时运行 type_check 检查类型

## 输出要求

- 只输出必要的代码变更
- 不添加无意义的注释
- 保持与项目现有风格一致`;
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
      messages: result.messages?.length || 0,
      lastMessage: result.messages?.[result.messages.length - 1]?.content,
    };
  }
}
