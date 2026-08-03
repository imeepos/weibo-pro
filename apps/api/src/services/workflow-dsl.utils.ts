import { compile } from '@sker/workflow-compiler';

/**
 * 会话状态
 */
export interface SessionState {
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
 * 创建新的会话状态。
 */
export function createSession(sessionId: string, description: string): SessionState {
  return {
    sessionId,
    description,
    currentDSL: '',
    history: [],
    createdAt: Date.now(),
  };
}

/**
 * 创建传给 Agent 的上下文对象。
 */
export function createAgentContext(sessionId: string) {
  return {
    projectPath: process.cwd(),
    sessionId,
    messages: [],
    subTasks: [],
    artifacts: new Map(),
    memory: new Map(),
  };
}

export interface CompilationSummary {
  compilationStatus: 'success' | 'error';
  errors?: string[];
}

/**
 * 编译 DSL 并汇总编译状态与错误消息。
 */
export function buildCompilationSummary(dslCode: string): CompilationSummary {
  const compilationResult = compile(dslCode);

  return {
    compilationStatus: compilationResult.success ? 'success' : 'error',
    errors: compilationResult.errors?.map((err: any) => err.message),
  };
}

export interface GenerationResultInput {
  sessionId: string;
  dslCode: string;
  explanation: string;
  nodeCount: number;
  complexity: string;
}

export interface GenerationResult extends GenerationResultInput, CompilationSummary {}

/**
 * 将 Agent 输出与编译结果汇总为对外返回结构。
 */
export function buildGenerationResult(input: GenerationResultInput): GenerationResult {
  return {
    ...input,
    ...buildCompilationSummary(input.dslCode),
  };
}

export interface WorkflowCompileResult {
  success: boolean;
  workflowGraph?: any;
  errors?: Array<{ message: string; line?: number; column?: number; severity?: string }>;
}

/**
 * 编译 DSL 代码，返回编译状态、工作流图或错误列表。
 */
export function compileWorkflow(dslCode: string): WorkflowCompileResult {
  try {
    const result = compile(dslCode);

    if (result.success) {
      return {
        success: true,
        workflowGraph: result.workflowGraph,
      };
    }

    return {
      success: false,
      errors: result.errors?.map((err: any) => ({
        message: err.message,
        line: err.line,
        column: err.column,
        severity: err.severity,
      })),
    };
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
