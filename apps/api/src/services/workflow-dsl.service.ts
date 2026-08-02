import { WorkflowDSLGeneratorAgent } from '@sker/agent';
import { getAllNodeTypes, findNodeType, NODE } from '@sker/workflow';
import { compile } from '@sker/workflow-compiler';
import { generateRandomString } from '@sker/utils';
import { logger, root } from '@sker/core';

/**
 * 会话状态
 */
interface SessionState {
  sessionId: string;
  description: string;
  currentDSL: string;
  history: Array<{
    dslCode: string;
    feedback?: string;
    timestamp: number;
  }>;
  createdAt: number;
}

/**
 * 工作流 DSL 生成服务
 *
 * 职责：
 * - 管理 WorkflowDSLGeneratorAgent 实例
 * - 维护会话状态（用于交互式优化）
 * - 提供 DSL 编译和验证功能
 */
export class WorkflowDSLService {
  private readonly agent: WorkflowDSLGeneratorAgent;
  private readonly sessions: Map<string, SessionState>;

  /** 会话过期时间（30 分钟） */
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000;

  constructor() {
    this.agent = new WorkflowDSLGeneratorAgent();
    this.sessions = new Map();

    // 定期清理过期会话
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * 从自然语言生成工作流 DSL
   */
  async generate(
    description: string,
    sessionId?: string
  ): Promise<{
    sessionId: string;
    dslCode: string;
    explanation: string;
    nodeCount: number;
    complexity: string;
    compilationStatus: 'success' | 'error';
    errors?: string[];
  }> {
    // 创建或获取会话
    const sid = sessionId || generateRandomString(21);
    let session = this.sessions.get(sid);

    if (!session) {
      session = {
        sessionId: sid,
        description,
        currentDSL: '',
        history: [],
        createdAt: Date.now(),
      };
      this.sessions.set(sid, session);
    }

    // 创建任务和上下文
    const task = {
      id: generateRandomString(21),
      type: 'research' as const,
      description: `生成工作流 DSL: ${description}`,
      input: { description },
      priority: 'normal' as const,
      status: 'pending' as const,
      createdAt: Date.now(),
    };

    const context = {
      projectPath: process.cwd(),
      sessionId: sid,
      messages: [],
      subTasks: [],
      artifacts: new Map(),
      memory: new Map(),
    };

    try {
      // 执行 Agent
      const result = await this.agent.execute(task, context);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'DSL 生成失败');
      }

      const dslOutput = result.data as {
        dslCode: string;
        explanation: string;
        nodeCount: number;
        estimatedComplexity: string;
      };

      // 更新会话状态
      session.currentDSL = dslOutput.dslCode;
      session.history.push({
        dslCode: dslOutput.dslCode,
        timestamp: Date.now(),
      });

      // 验证编译状态
      const compilationResult = compile(dslOutput.dslCode);

      return {
        sessionId: sid,
        dslCode: dslOutput.dslCode,
        explanation: dslOutput.explanation,
        nodeCount: dslOutput.nodeCount,
        complexity: dslOutput.estimatedComplexity,
        compilationStatus: compilationResult.success ? 'success' : 'error',
        errors: compilationResult.errors?.map((err: any) => err.message),
      };
    } catch (error) {
      logger.error('DSL 生成失败', {
        sessionId: sid,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 基于用户反馈优化 DSL
   */
  async refine(
    sessionId: string,
    feedback: string
  ): Promise<{
    sessionId: string;
    dslCode: string;
    explanation: string;
    nodeCount: number;
    complexity: string;
    compilationStatus: 'success' | 'error';
    errors?: string[];
  }> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    if (!session.currentDSL) {
      throw new Error('会话中没有当前 DSL，请先生成 DSL');
    }

    // 创建上下文
    const context = {
      projectPath: process.cwd(),
      sessionId,
      messages: [],
      subTasks: [],
      artifacts: new Map(),
      memory: new Map(),
    };

    try {
      // 调用 Agent 的 refine 方法
      const result = await this.agent.refine(session.currentDSL, feedback, context);

      // 更新会话状态
      session.currentDSL = result.dslCode;
      session.history.push({
        dslCode: result.dslCode,
        feedback,
        timestamp: Date.now(),
      });

      // 验证编译状态
      const compilationResult = compile(result.dslCode);

      return {
        sessionId,
        dslCode: result.dslCode,
        explanation: result.explanation,
        nodeCount: result.nodeCount,
        complexity: result.estimatedComplexity,
        compilationStatus: compilationResult.success ? 'success' : 'error',
        errors: compilationResult.errors?.map((err: any) => err.message),
      };
    } catch (error) {
      logger.error('DSL 优化失败', {
        sessionId,
        feedback,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 编译 DSL 代码
   */
  async compile(dslCode: string): Promise<{
    success: boolean;
    workflowGraph?: any;
    errors?: Array<{ message: string; line?: number; column?: number; severity?: string }>;
  }> {
    try {
      const result = compile(dslCode);

      if (result.success) {
        return {
          success: true,
          workflowGraph: result.workflowGraph,
        };
      } else {
        return {
          success: false,
          errors: result.errors?.map((err: any) => ({
            message: err.message,
            line: err.line,
            column: err.column,
            severity: err.severity,
          })),
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            message: error instanceof Error ? error.message : String(error),
            severity: 'error' as const,
          },
        ],
      };
    }
  }

  /**
   * 列出所有可用的节点类型
   */
  async listAvailableNodes(
    category: 'data-sources' | 'ai-capabilities' | 'data-processing' | 'all' = 'all'
  ): Promise<Array<{ name: string; title: string; type: string; description: string }>> {
    const allNodes = getAllNodeTypes();

    const filtered =
      category === 'all'
        ? allNodes
        : allNodes.filter(node => {
            const name = node.name.toLowerCase();
            if (category === 'data-sources')
              return name.includes('login') || name.includes('search') || name.includes('http');
            if (category === 'ai-capabilities')
              return name.includes('llm') || name.includes('agent') || name.includes('generator');
            if (category === 'data-processing')
              return (
                name.includes('analyzer') || name.includes('filter') || name.includes('transform')
              );
            return true;
          });

    return filtered.map((node: any) => {
      const metadata = root.get(NODE, []).find((m: any) => m.target === node);
      return {
        name: node.name,
        title: metadata?.title || node.name,
        type: metadata?.type || 'unknown',
        description: '无描述',
      };
    });
  }

  /**
   * 获取指定节点的 Schema
   */
  async getNodeSchema(nodeType: string): Promise<{
    name: string;
    title: string;
    description: string;
    inputs: Array<{ name: string; type: string; required: boolean; description: string }>;
    outputs: Array<{ name: string; type: string; description: string }>;
  }> {
    const NodeClass = findNodeType(nodeType);

    if (!NodeClass) {
      throw new Error(`未找到节点类型: ${nodeType}`);
    }

    const _instance = new NodeClass();
    const metadata = root.get(NODE, []).find((m: any) => m.target === NodeClass);
    const inputs = Reflect.getMetadata('node:inputs', NodeClass.prototype) || [];
    const outputs = Reflect.getMetadata('node:outputs', NodeClass.prototype) || [];

    return {
      name: nodeType,
      title: metadata?.title || nodeType,
      description: '无描述',
      inputs: inputs.map((input: any) => ({
        name: input.propertyKey,
        type: input.type || 'any',
        required: input.required !== false,
        description: input.description || '',
      })),
      outputs: outputs.map((output: any) => ({
        name: output.propertyKey,
        type: output.type || 'any',
        description: output.description || '',
      })),
    };
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      if (now - session.createdAt > this.SESSION_TIMEOUT) {
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
      logger.info('清理过期会话', { sessionId });
    });

    if (expiredSessions.length > 0) {
      logger.info('会话清理完成', { count: expiredSessions.length });
    }
  }
}
