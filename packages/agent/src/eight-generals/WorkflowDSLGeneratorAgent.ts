import { BaseGeneral } from './BaseGeneral';
import type { GeneralRole, AgentTask, AgentContext, AgentCapability } from './types';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { compile } from '@sker/workflow-compiler';

/** DSL 生成结果 Schema */
const WorkflowDSLSchema = z.object({
  dslCode: z.string().describe('完整的工作流 DSL 代码'),
  explanation: z.string().describe('工作流功能说明'),
  nodeCount: z.number().describe('节点数量'),
  estimatedComplexity: z.enum(['simple', 'medium', 'complex']).describe('复杂度评估'),
});

type WorkflowDSLOutput = z.infer<typeof WorkflowDSLSchema>;

/**
 * WorkflowDSLGeneratorAgent - 工作流 DSL 生成智能体
 *
 * 职责：
 * - 将自然语言描述转换为工作流 DSL
 * - 验证 DSL 语法和语义
 * - 迭代优化直到编译成功
 */
export class WorkflowDSLGeneratorAgent extends BaseGeneral {
  readonly role: GeneralRole = 'yao';
  readonly description = `工作流 DSL 生成专家，负责：
1. 理解用户的自然语言任务描述
2. 生成符合语法的 DSL 代码
3. 验证并迭代优化 DSL
4. 确保 DSL 可成功编译为可执行工作流`;

  /** 最大重试次数 */
  private readonly MAX_RETRIES = 3;

  constructor() {
    super(0.3); // 使用较低温度以提高生成稳定性
    this.initState();
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        name: 'dsl_generation',
        description: '从自然语言生成工作流 DSL',
      },
      {
        name: 'dsl_validation',
        description: '验证 DSL 语法和语义',
      },
    ];
  }

  getTools(): StructuredToolInterface[] {
    // 工具调用未接入执行循环（模型仅做结构化输出），暂不声明工具
    return [];
  }

  protected buildSystemPrompt(context: AgentContext): string {
    const basePrompt = super.buildSystemPrompt(context);

    return `${basePrompt}

## 专业能力
你是工作流 DSL 生成专家，精通以下技能：

### 1. DSL 语法规范
\`\`\`
workflow "工作流名称" {
  variables {
    varName = "value"
    delay = 3000
  }

  node nodeId {
    type: NodeClassName
    inputs: {
      property: "value"
      number: 123
    }
    position: { x: 100, y: 200 }
  }

  sourceNode.outputPort -> targetNode.inputPort
  sourceNode.output -> targetNode.input [when: $variable > 0.7]
}
\`\`\`

### 2. 工作流程
1. 分析任务描述，确定需要的节点类型
2. 生成 DSL 代码
3. 编译验证语法
4. 如有错误，分析并重新生成（最多 ${this.MAX_RETRIES} 次）
5. 确认编译成功

### 3. 生成原则
- 节点 ID 使用小写驼峰命名（如 loginNode, searchNode）
- 节点类型使用准确的类名（如 WeiboLoginAst, WeiboKeywordSearchAst）
- 连接使用正确的端口名称
- 位置坐标合理分布（x 间隔 200-300，y 根据层级调整）
- 变量名清晰表达用途

### 4. 常见节点类别
- **数据源**: WeiboLoginAst, WeiboKeywordSearchAst, HttpRequestAst
- **AI 能力**: LlmTextAgentAst, LlmStructuredOutputAst
- **数据处理**: PostNLPAnalyzerAst, EventAutoCreatorAst, FilterNodeAst
- **动作**: SaveNodeAst, NotifyNodeAst

### 5. 错误处理
- 编译错误：检查节点类型名称是否正确
- 连接错误：确认端口名称与 Schema 匹配
- 语法错误：检查括号、引号、逗号是否正确`;
  }

  protected async doExecute(task: AgentTask, context: AgentContext): Promise<WorkflowDSLOutput> {
    const description = task.input.description as string;
    if (!description) {
      throw new Error('任务描述不能为空');
    }

    // 使用结构化输出生成 DSL
    const structuredModel = this.model.withStructuredOutput(WorkflowDSLSchema);

    let attempt = 0;
    let lastError: string | undefined;

    while (attempt < this.MAX_RETRIES) {
      attempt++;

      try {
        // 构建提示词
        const prompt = this.buildGenerationPrompt(description, lastError, attempt);

        // 生成 DSL
        const result = await structuredModel.invoke([
          { role: 'system', content: this.buildSystemPrompt(context) },
          { role: 'user', content: prompt },
        ]);

        // 验证 DSL
        const compilationResult = compile(result.dslCode);

        if (compilationResult.success) {
          // 编译成功，返回结果
          this.sendMessage('ti', 'notification', {
            message: `DSL 生成成功（尝试 ${attempt}/${this.MAX_RETRIES}）`,
            nodeCount: result.nodeCount,
            complexity: result.estimatedComplexity,
          }, context);

          return result;
        } else {
          // 编译失败，记录错误并重试
          lastError = compilationResult.errors
            ?.map((err: any) => `[${err.severity}] 第 ${err.line} 行: ${err.message}`)
            .join('\n') || '未知编译错误';

          this.sendMessage('ti', 'notification', {
            message: `DSL 编译失败（尝试 ${attempt}/${this.MAX_RETRIES}），正在重试...`,
            errors: lastError,
          }, context);

          if (attempt >= this.MAX_RETRIES) {
            throw new Error(`DSL 生成失败（已尝试 ${this.MAX_RETRIES} 次）：\n${lastError}`);
          }
        }
      } catch (error) {
        if (attempt >= this.MAX_RETRIES) {
          throw error;
        }
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    throw new Error('DSL 生成失败：超过最大重试次数');
  }

  /**
   * 构建生成提示词
   */
  private buildGenerationPrompt(description: string, lastError?: string, attempt: number = 1): string {
    let prompt = `请根据以下任务描述生成工作流 DSL：

**任务描述**：
${description}

**要求**：
1. 首先思考需要哪些节点类型
2. 生成完整的 DSL 代码
3. 确保语法正确，节点连接合理`;

    if (lastError && attempt > 1) {
      prompt += `

**上次生成失败，错误信息**：
${lastError}

**请修正以下问题**：
- 检查节点类型名称是否正确
- 确认端口名称与 Schema 匹配
- 检查语法错误（括号、引号、逗号）
- 确保所有节点都正确连接`;
    }

    return prompt;
  }

  /**
   * 支持交互式优化（用于 API 调用）
   */
  async refine(
    currentDSL: string,
    feedback: string,
    context: AgentContext
  ): Promise<WorkflowDSLOutput> {
    const structuredModel = this.model.withStructuredOutput(WorkflowDSLSchema);

    const prompt = `请根据用户反馈优化以下工作流 DSL：

**当前 DSL**：
\`\`\`
${currentDSL}
\`\`\`

**用户反馈**：
${feedback}

**要求**：
1. 理解用户的优化需求
2. 保持原有功能的基础上进行改进
3. 确保修改后的 DSL 可以成功编译`;

    const result = await structuredModel.invoke([
      { role: 'system', content: this.buildSystemPrompt(context) },
      { role: 'user', content: prompt },
    ]);

    // 验证优化后的 DSL
    const compilationResult = compile(result.dslCode);

    if (!compilationResult.success) {
      throw new Error(`优化后的 DSL 编译失败：\n${compilationResult.errors?.map(e => e.message).join('\n')}`);
    }

    return result;
  }
}
