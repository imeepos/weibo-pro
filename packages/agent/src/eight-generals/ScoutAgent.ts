import { Injectable } from '@sker/core';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { BaseGeneral } from './BaseGeneral';
import { codeTools, testTools } from './tools';
import type { GeneralRole, AgentTask, AgentContext, AgentCapability } from './types';

/**
 * ScoutAgent - 风将
 *
 * 代码侦察专家，职责：
 * - 代码审查
 * - 漏洞扫描
 * - 代码质量分析
 */
@Injectable()
export class ScoutAgent extends BaseGeneral {
  readonly role: GeneralRole = 'feng';
  readonly description = '代码侦察专家，负责代码审查、漏洞扫描和质量分析';

  private agent: ReturnType<typeof createReactAgent>;

  constructor() {
    super(0.2); // 审查需要严谨
    this.initState();
    this.agent = createReactAgent({
      llm: this.model,
      tools: this.getTools(),
      checkpointSaver: new MemorySaver(),
    });
  }

  getCapabilities(): AgentCapability[] {
    return [
      { name: 'code_review', description: '代码审查' },
      { name: 'security_scan', description: '安全扫描' },
      { name: 'quality_analysis', description: '质量分析' },
    ];
  }

  getTools() {
    return [
      ...codeTools.filter((t) =>
        ['read_file', 'search_code', 'find_files', 'list_dir'].includes(t.name)
      ),
      ...testTools.filter((t) => t.name === 'run_lint'),
    ];
  }

  protected buildSystemPrompt(context: AgentContext): string {
    return `${super.buildSystemPrompt(context)}

## 审查原则

1. **安全第一**：检查注入、XSS、敏感信息泄露等安全问题
2. **代码质量**：检查代码规范、命名、结构
3. **性能隐患**：检查潜在的性能问题
4. **可维护性**：检查代码是否易于理解和维护

## 审查清单

- [ ] 是否有硬编码的敏感信息
- [ ] 是否有 SQL/命令注入风险
- [ ] 是否有未处理的异常
- [ ] 是否有性能问题（N+1查询、大循环等）
- [ ] 命名是否清晰准确
- [ ] 是否有重复代码
- [ ] 是否符合项目规范

## 输出格式

1. **安全问题**：严重程度 + 位置 + 修复建议
2. **代码问题**：问题类型 + 位置 + 改进建议
3. **优化建议**：可选的改进点
4. **总体评价**：通过/需修改/需重写`;
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
      review: result.messages?.[result.messages.length - 1]?.content,
    };
  }
}
