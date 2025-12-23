/**
 * 千门八将 - 类型定义
 *
 * 八将角色：
 * - 正(zheng): CodeAgent - 编码实现
 * - 提(ti): Orchestrator - 调度中枢
 * - 反(fan): Architect - 架构设计
 * - 脱(tuo): DeployAgent - 部署发布
 * - 风(feng): ScoutAgent - 代码审查
 * - 火(huo): GuardAgent - 测试防护
 * - 除(chu): FixerAgent - 问题修复
 * - 谣(yao): ResearchAgent - 技术调研
 */

/** 将领角色 */
export type GeneralRole =
  | 'zheng' // 正将 - CodeAgent
  | 'ti' // 提将 - Orchestrator
  | 'fan' // 反将 - Architect
  | 'tuo' // 脱将 - DeployAgent
  | 'feng' // 风将 - ScoutAgent
  | 'huo' // 火将 - GuardAgent
  | 'chu' // 除将 - FixerAgent
  | 'yao'; // 谣将 - ResearchAgent

/** 角色元信息 */
export const GENERAL_META: Record<GeneralRole, { name: string; title: string }> = {
  zheng: { name: '正将', title: 'CodeAgent' },
  ti: { name: '提将', title: 'Orchestrator' },
  fan: { name: '反将', title: 'Architect' },
  tuo: { name: '脱将', title: 'DeployAgent' },
  feng: { name: '风将', title: 'ScoutAgent' },
  huo: { name: '火将', title: 'GuardAgent' },
  chu: { name: '除将', title: 'FixerAgent' },
  yao: { name: '谣将', title: 'ResearchAgent' },
};

/** 任务优先级 */
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

/** 任务状态 */
export type TaskStatus = 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'blocked';

/** 任务类型 */
export type TaskType =
  | 'code' // 编码任务
  | 'architecture' // 架构设计
  | 'deploy' // 部署发布
  | 'review' // 代码审查
  | 'test' // 测试任务
  | 'fix' // 问题修复
  | 'research' // 技术调研
  | 'general'; // 通用任务

/** 智能体任务 */
export interface AgentTask {
  id: string;
  type: TaskType;
  description: string;
  input: Record<string, unknown>;
  assignedTo?: GeneralRole;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies?: string[];
  result?: unknown;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

/** 消息类型 */
export type MessageType = 'request' | 'response' | 'notification' | 'handoff';

/** 智能体消息 */
export interface AgentMessage {
  id: string;
  from: GeneralRole;
  to: GeneralRole | 'broadcast';
  type: MessageType;
  payload: unknown;
  timestamp: number;
  replyTo?: string;
}

/** 上下文 */
export interface AgentContext {
  sessionId: string;
  projectPath: string;
  currentTask?: AgentTask;
  subTasks: AgentTask[];
  messages: AgentMessage[];
  artifacts: Map<string, unknown>;
  memory: Map<string, unknown>;
}

/** 智能体能力声明 */
export interface AgentCapability {
  name: string;
  description: string;
}

/** 智能体状态 */
export type AgentStatus = 'idle' | 'busy' | 'waiting';

export interface AgentState {
  role: GeneralRole;
  status: AgentStatus;
  currentTask?: string;
  capabilities: AgentCapability[];
}

/** 执行结果 */
export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

/** 任务计划 */
export interface TaskPlan {
  tasks: AgentTask[];
  dependencies: Map<string, string[]>;
}

/** 生成唯一ID */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** 创建任务 */
export function createTask(params: {
  type: TaskType;
  description: string;
  input?: Record<string, unknown>;
  assignedTo?: GeneralRole;
  priority?: TaskPriority;
  dependencies?: string[];
}): AgentTask {
  return {
    id: generateId('task'),
    type: params.type,
    description: params.description,
    input: params.input || {},
    assignedTo: params.assignedTo,
    priority: params.priority || 'normal',
    status: params.assignedTo ? 'assigned' : 'pending',
    dependencies: params.dependencies,
    createdAt: Date.now(),
  };
}

/** 创建消息 */
export function createMessage(params: {
  from: GeneralRole;
  to: GeneralRole | 'broadcast';
  type: MessageType;
  payload: unknown;
  replyTo?: string;
}): AgentMessage {
  return {
    id: generateId('msg'),
    from: params.from,
    to: params.to,
    type: params.type,
    payload: params.payload,
    timestamp: Date.now(),
    replyTo: params.replyTo,
  };
}

/** 创建上下文 */
export function createContext(projectPath: string): AgentContext {
  return {
    sessionId: generateId('session'),
    projectPath,
    subTasks: [],
    messages: [],
    artifacts: new Map(),
    memory: new Map(),
  };
}
