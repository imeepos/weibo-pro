import { ChatOpenAI } from '@langchain/openai';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type {
  GeneralRole,
  AgentTask,
  AgentContext,
  AgentCapability,
  AgentState,
  AgentMessage,
  ExecutionResult,
} from './types';
import { createMessage, GENERAL_META } from './types';

/** LLM 配置 */
const LLM_PROXY_BASE_URL = 'http://localhost:8089/llm/openai';
const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V3.2';

/**
 * BaseGeneral - 八将基类
 *
 * 所有智能体的基础，定义统一的生命周期和接口
 */
export abstract class BaseGeneral {
  /** 角色代号 */
  abstract readonly role: GeneralRole;

  /** 职责描述 */
  abstract readonly description: string;

  /** LLM 实例 */
  protected model: ChatOpenAI;

  /** 当前状态 */
  protected state: AgentState;

  /** 角色名称 */
  get name(): string {
    return GENERAL_META[this.role].name;
  }

  /** 角色标题 */
  get title(): string {
    return GENERAL_META[this.role].title;
  }

  constructor(temperature: number = 0.3) {
    this.model = new ChatOpenAI({
      modelName: DEFAULT_MODEL,
      temperature,
      configuration: { baseURL: LLM_PROXY_BASE_URL },
    });

    // 延迟初始化状态（避免在构造函数中访问抽象属性）
    this.state = undefined as unknown as AgentState;
  }

  /** 初始化状态（子类构造函数中调用） */
  protected initState(): void {
    this.state = {
      role: this.role,
      status: 'idle',
      capabilities: this.getCapabilities(),
    };
  }

  /** 声明能力 - 子类实现 */
  abstract getCapabilities(): AgentCapability[];

  /** 获取工具列表 - 子类实现 */
  abstract getTools(): StructuredToolInterface[];

  /** 构建系统提示词 */
  protected buildSystemPrompt(context: AgentContext): string {
    return `你是"${this.name}"(${this.title})，千门八将之一。

## 角色定位
${this.description}

## 项目信息
- 路径: ${context.projectPath}
- 会话: ${context.sessionId}

## 工作原则
1. 专注于自己的职责范围
2. 需要协助时，通过消息请求其他智能体
3. 所有操作结果需明确汇报
4. 遵循代码艺术家哲学：简洁、优雅、不过度设计`;
  }

  /** 执行任务 */
  async execute(task: AgentTask, context: AgentContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.state.status = 'busy';
    this.state.currentTask = task.id;

    try {
      const result = await this.doExecute(task, context);
      this.state.status = 'idle';
      this.state.currentTask = undefined;

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.state.status = 'idle';
      this.state.currentTask = undefined;

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /** 实际执行逻辑 - 子类实现 */
  protected abstract doExecute(task: AgentTask, context: AgentContext): Promise<unknown>;

  /** 发送消息 */
  protected sendMessage(
    to: GeneralRole | 'broadcast',
    type: AgentMessage['type'],
    payload: unknown,
    context: AgentContext
  ): AgentMessage {
    const message = createMessage({
      from: this.role,
      to,
      type,
      payload,
    });
    context.messages.push(message);
    return message;
  }

  /** 获取当前状态 */
  getState(): AgentState {
    return { ...this.state };
  }

  /** 检查是否空闲 */
  isIdle(): boolean {
    return this.state.status === 'idle';
  }
}
