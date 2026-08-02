import { Injectable } from '@sker/core';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { BaseGeneral } from './BaseGeneral';
import type {
  GeneralRole,
  AgentTask,
  AgentContext,
  AgentCapability,
  TaskType,
  ExecutionResult,
} from './types';
import { createTask, createContext, } from './types';

/** 任务类型到角色的映射 */
const _TASK_ROLE_MAP: Record<TaskType, GeneralRole[]> = {
  code: ['zheng', 'feng'],
  architecture: ['fan', 'yao'],
  deploy: ['tuo', 'huo'],
  review: ['feng', 'huo'],
  test: ['huo', 'feng'],
  fix: ['chu', 'feng'],
  research: ['yao'],
  general: ['fan', 'zheng'],
};

/**
 * Orchestrator - 提将
 *
 * 千门八将的中枢调度者，职责：
 * 1. 接收用户任务，分析拆解
 * 2. 分配给合适的智能体
 * 3. 协调执行，管理依赖
 * 4. 汇总结果返回
 */
@Injectable()
export class Orchestrator extends BaseGeneral {
  readonly role: GeneralRole = 'ti';
  readonly description = '任务调度与协调中枢，负责任务拆解、分配、协调和结果汇总';

  /** 注册的智能体 */
  private generals = new Map<GeneralRole, BaseGeneral>();

  /** 调度 Agent */
  private schedulerAgent: ReturnType<typeof createReactAgent>;

  constructor() {
    super(0.2);
    this.initState();
    this.initSchedulerAgent();
  }

  /** 初始化调度 Agent */
  private initSchedulerAgent() {
    this.schedulerAgent = createReactAgent({
      llm: this.model,
      tools: this.getTools(),
      checkpointSaver: new MemorySaver(),
    });
  }

  /** 注册智能体 */
  register(general: BaseGeneral): this {
    this.generals.set(general.role, general);
    return this;
  }

  /** 批量注册 */
  registerAll(generals: BaseGeneral[]): this {
    generals.forEach((g) => this.register(g));
    return this;
  }

  /** 执行用户任务（主入口） */
  async run(userRequest: string, projectPath: string): Promise<ExecutionResult> {
    const context = createContext(projectPath);
    const startTime = Date.now();

    try {
      // 1. 分析并生成执行计划
      const tasks = await this.analyzeAndPlan(userRequest, context);

      // 2. 执行计划
      const results = await this.executePlan(tasks, context);

      // 3. 汇总结果
      return {
        success: true,
        data: {
          sessionId: context.sessionId,
          taskCount: tasks.length,
          results: Object.fromEntries(results),
          artifacts: Object.fromEntries(context.artifacts),
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /** 分析任务并生成执行计划 */
  private async analyzeAndPlan(userRequest: string, context: AgentContext): Promise<AgentTask[]> {
    const systemPrompt = this.buildPlannerPrompt();

    const result = await this.schedulerAgent.invoke(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userRequest },
        ],
      },
      { configurable: { thread_id: context.sessionId } }
    );

    // 解析输出中的任务
    return this.parseTasksFromResult(result);
  }

  /** 执行计划 */
  private async executePlan(
    tasks: AgentTask[],
    context: AgentContext
  ): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();
    const completed = new Set<string>();

    // 按依赖拓扑排序执行
    while (completed.size < tasks.length) {
      // 找出可执行的任务
      const ready = tasks.filter(
        (t) =>
          !completed.has(t.id) && (t.dependencies || []).every((d) => completed.has(d))
      );

      if (ready.length === 0 && completed.size < tasks.length) {
        throw new Error('存在循环依赖或无法执行的任务');
      }

      // 并行执行
      const execResults = await Promise.all(
        ready.map((task) => this.executeTask(task, context))
      );

      // 记录结果
      ready.forEach((task, idx) => {
        results.set(task.id, execResults[idx]);
        completed.add(task.id);
      });
    }

    return results;
  }

  /** 执行单个任务 */
  private async executeTask(task: AgentTask, context: AgentContext): Promise<unknown> {
    const general = this.generals.get(task.assignedTo!);
    if (!general) {
      throw new Error(`未找到智能体: ${task.assignedTo}`);
    }

    task.status = 'running';
    task.startedAt = Date.now();

    const result = await general.execute(task, context);

    if (result.success) {
      task.status = 'completed';
      task.completedAt = Date.now();
      task.result = result.data;
    } else {
      task.status = 'failed';
      task.error = result.error;
    }

    return result;
  }

  /** 构建规划器提示词 */
  private buildPlannerPrompt(): string {
    const agentList = Array.from(this.generals.entries())
      .map(([role, g]) => `- ${role}(${g.name}): ${g.description}`)
      .join('\n');

    return `你是"提将"，千门八将的中枢调度者。

## 可用智能体
${agentList || '暂无注册的智能体'}

## 角色职责
- zheng(正将): 代码编写、功能实现
- fan(反将): 系统设计、架构决策
- tuo(脱将): 部署发布、版本管理
- feng(风将): 代码审查、漏洞扫描
- huo(火将): 测试验证、安全防护
- chu(除将): Debug调试、故障修复
- yao(谣将): 技术调研、文档生成

## 任务分配工具
使用 create_task 工具创建任务，设置：
- type: 任务类型
- description: 任务描述
- assignedTo: 分配的智能体角色
- priority: 优先级
- dependencies: 依赖的任务ID（可选）

## 工作流程
1. 分析用户请求，识别需要的能力
2. 拆解为具体子任务
3. 为每个子任务选择合适的智能体
4. 设置任务间的依赖关系
5. 调用 create_task 创建所有任务

## 输出要求
- 必须调用 create_task 工具创建任务
- 复杂任务要拆解，简单任务直接分配
- 注意设置合理的依赖关系`;
  }

  /** 从结果解析任务 */
  private parseTasksFromResult(result: any): AgentTask[] {
    const tasks: AgentTask[] = [];

    // 遍历消息，提取工具调用创建的任务
    for (const msg of result.messages || []) {
      if (msg.tool_calls) {
        for (const call of msg.tool_calls) {
          if (call.name === 'create_task' && call.args) {
            const task = createTask({
              type: call.args.type || 'general',
              description: call.args.description,
              assignedTo: call.args.assignedTo,
              priority: call.args.priority,
              dependencies: call.args.dependencies,
            });
            tasks.push(task);
          }
        }
      }
    }

    // 如果没有解析到任务，创建一个默认任务
    if (tasks.length === 0) {
      const lastMessage = result.messages?.[result.messages.length - 1];
      tasks.push(
        createTask({
          type: 'general',
          description: lastMessage?.content || '执行用户请求',
          assignedTo: 'zheng',
        })
      );
    }

    return tasks;
  }

  /** 分类任务类型 */
  private classifyTask(request: string): TaskType {
    if (/实现|编写|创建|添加|开发/.test(request)) return 'code';
    if (/设计|架构|方案|规划/.test(request)) return 'architecture';
    if (/部署|发布|CI|CD|上线/.test(request)) return 'deploy';
    if (/审查|review|检查|扫描/.test(request)) return 'review';
    if (/测试|test|安全/.test(request)) return 'test';
    if (/修复|fix|bug|调试|debug/.test(request)) return 'fix';
    if (/调研|文档|分析|研究/.test(request)) return 'research';
    return 'general';
  }

  // --- BaseGeneral 接口实现 ---

  getCapabilities(): AgentCapability[] {
    return [
      { name: 'task_orchestration', description: '任务编排和调度' },
      { name: 'agent_coordination', description: '智能体协调' },
    ];
  }

  getTools() {
    return [
      tool(
        async ({ type, description, assignedTo, priority, dependencies }) => {
          return JSON.stringify({
            created: true,
            type,
            description,
            assignedTo,
            priority,
            dependencies,
          });
        },
        {
          name: 'create_task',
          description: '创建并分配任务给指定智能体',
          schema: z.object({
            type: z
              .enum(['code', 'architecture', 'deploy', 'review', 'test', 'fix', 'research', 'general'])
              .describe('任务类型'),
            description: z.string().describe('任务描述'),
            assignedTo: z
              .enum(['zheng', 'fan', 'tuo', 'feng', 'huo', 'chu', 'yao'])
              .describe('分配给哪个智能体'),
            priority: z.enum(['critical', 'high', 'normal', 'low']).default('normal'),
            dependencies: z.array(z.string()).optional().describe('依赖的任务ID'),
          }),
        }
      ),
      tool(
        async () => {
          const statuses = Array.from(this.generals.entries()).map(([role, g]) => ({
            role,
            name: g.name,
            status: g.getState().status,
            capabilities: g.getCapabilities().map((c) => c.name),
          }));
          return JSON.stringify(statuses);
        },
        {
          name: 'query_agents',
          description: '查询所有智能体状态',
          schema: z.object({}),
        }
      ),
    ];
  }

  protected async doExecute(task: AgentTask, context: AgentContext): Promise<unknown> {
    return this.run(task.description, context.projectPath);
  }
}
