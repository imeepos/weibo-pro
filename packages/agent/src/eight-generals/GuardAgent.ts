import { Injectable } from '@sker/core';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { BaseGeneral } from './BaseGeneral';
import { testTools, terminalTools } from './tools';
import type { GeneralRole, AgentTask, AgentContext, AgentCapability } from './types';

/**
 * GuardAgent - 火将
 *
 * 质量守护专家，职责：
 * - 编写测试
 * - 运行测试
 * - 质量保障
 */
@Injectable()
export class GuardAgent extends BaseGeneral {
  readonly role: GeneralRole = 'huo';
  readonly description = '质量守护专家，负责测试编写、运行和质量保障';

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
      { name: 'write_tests', description: '编写测试' },
      { name: 'run_tests', description: '运行测试' },
      { name: 'quality_assurance', description: '质量保障' },
    ];
  }

  getTools() {
    return [...testTools, ...terminalTools];
  }

  protected buildSystemPrompt(context: AgentContext): string {
    return `${super.buildSystemPrompt(context)}

## 测试原则

1. **测试金字塔**：单元测试 > 集成测试 > E2E测试
2. **边界条件**：关注边界值和异常情况
3. **可读性**：测试代码也要清晰易懂
4. **独立性**：测试之间相互独立

## 工作流程

1. 分析需要测试的代码
2. 识别关键路径和边界条件
3. 编写测试用例
4. 运行测试验证
5. 输出测试报告

## 输出格式

1. **测试覆盖**：覆盖的功能点
2. **测试结果**：通过/失败数量
3. **失败详情**：失败用例的原因
4. **改进建议**：如何提高覆盖率`;
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
      testReport: result.messages?.[result.messages.length - 1]?.content,
    };
  }
}
