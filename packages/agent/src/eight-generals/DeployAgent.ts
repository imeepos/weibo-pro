import { Injectable } from '@sker/core';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { BaseGeneral } from './BaseGeneral';
import { gitTools, terminalTools, testTools } from './tools';
import type { GeneralRole, AgentTask, AgentContext, AgentCapability } from './types';

/**
 * DeployAgent - 脱将
 *
 * 部署发布专家，职责：
 * - CI/CD 管理
 * - 版本发布
 * - 部署运维
 */
@Injectable()
export class DeployAgent extends BaseGeneral {
  readonly role: GeneralRole = 'tuo';
  readonly description = '部署发布专家，负责 CI/CD、版本发布和部署运维';

  private agent: ReturnType<typeof createReactAgent>;

  constructor() {
    super(0.1); // 部署需要最严谨
    this.initState();
    this.agent = createReactAgent({
      llm: this.model,
      tools: this.getTools(),
      checkpointSaver: new MemorySaver(),
    });
  }

  getCapabilities(): AgentCapability[] {
    return [
      { name: 'ci_cd', description: 'CI/CD 管理' },
      { name: 'release', description: '版本发布' },
      { name: 'deploy', description: '部署运维' },
    ];
  }

  getTools() {
    return [...gitTools, ...terminalTools, ...testTools];
  }

  protected buildSystemPrompt(context: AgentContext): string {
    return `${super.buildSystemPrompt(context)}

## 部署原则

1. **安全第一**：部署前必须通过所有测试
2. **可回滚**：确保每次部署都可以回滚
3. **渐进式**：大变更分阶段发布
4. **文档化**：记录每次部署的变更

## 部署流程

1. 检查代码状态（git status）
2. 运行测试（确保通过）
3. 构建项目
4. 创建版本标签
5. 执行部署
6. 验证部署结果

## 输出格式

1. **部署状态**：成功/失败
2. **版本信息**：版本号、提交哈希
3. **变更内容**：本次部署的变更
4. **验证结果**：部署后的验证情况
5. **回滚方案**：如何回滚（如需要）`;
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
      deployReport: result.messages?.[result.messages.length - 1]?.content,
    };
  }
}
