import { BadRequestException, NotFoundException, logger, root } from '@sker/core';
import {
  fromJson,
  INode,
  executeWorkflowImmediate,
  WorkflowGraphAst,
} from '@sker/workflow';
import { WorkflowRunService } from '../../services/workflow-run.service';
import { WorkflowRunEntity, RunStatus } from '@sker/entities';
import { extractNodeOutputs, extractWorkflowOutputs } from './workflow-outputs';

/**
 * 工作流运行实例处理器
 *
 * 存在即合理：
 * - 创建工作流运行实例并记录快照
 * - 执行运行实例，实时更新运行状态和节点状态
 * - 查询、取消运行实例
 */
export class WorkflowRunHandler {
  private readonly workflowRunService: WorkflowRunService;

  constructor() {
    this.workflowRunService = root.get(WorkflowRunService);
  }

  /**
   * 创建工作流运行实例
   *
   * 优雅设计：
   * - 为每次运行创建独立的实例记录
   * - 支持自定义输入参数
   * - 保存工作流快照，确保运行独立性
   * - 返回运行实例 ID，用于后续查询和执行
   */
  async createRun(
    body: { workflowId: string; inputs?: Record<string, unknown> },
  ): Promise<{ runId: string; run: WorkflowRunEntity }> {
    const { workflowId, inputs } = body;

    if (!workflowId) {
      throw new BadRequestException('工作流 ID 不能为空');
    }

    const run = await this.workflowRunService.createRun(workflowId, inputs);

    logger.info('运行实例已创建', { runId: run.id, workflowId });

    return {
      runId: run.id,
      run,
    };
  }

  /**
   * 执行工作流运行实例
   *
   * 优雅设计：
   * - 从运行实例获取工作流快照和输入参数
   * - 使用 inputs 作为执行上下文
   * - 实时更新运行状态和节点状态
   * - 记录执行耗时和错误信息
   * - 返回完整的运行结果
   */
  async executeRun(body: { runId: string }): Promise<WorkflowRunEntity> {
    const { runId } = body;

    if (!runId) {
      throw new BadRequestException('运行实例 ID 不能为空');
    }

    // 获取运行实例
    const run = await this.workflowRunService.getRun(runId);

    if (!run) {
      throw new NotFoundException(`运行实例不存在: ${runId}`);
    }

    if (run.status !== RunStatus.PENDING) {
      throw new BadRequestException(`运行实例状态不正确: ${run.status}`);
    }

    try {
      // 标记运行开始
      await this.workflowRunService.startRun(runId);

      // 反序列化工作流 AST
      const ast = fromJson(run.graphSnapshot) as WorkflowGraphAst;

      // 执行工作流（AST 会被原地修改）
      await executeWorkflowImmediate(ast, run.inputs as Record<string, any> || {});

      // 提取节点状态
      const nodeStates: Record<string, unknown> = {};
      logger.info('执行结果', { hasNodes: !!ast.nodes, nodeCount: ast.nodes?.length });
      if (ast.nodes) {
        ast.nodes.forEach((node: INode) => {
          nodeStates[node.id] = {
            state: node.state,
            error: node.error,
            // 保存节点的输出数据
            outputs: extractNodeOutputs(node),
          };
        });
      }
      logger.info('节点状态', { nodeStates: Object.keys(nodeStates) });

      // 提取工作流输出
      const outputs = extractWorkflowOutputs(ast);

      // 完成运行
      await this.workflowRunService.completeRun(runId, {
        success: ast.state === 'success',
        outputs,
        nodeStates,
        error: ast.error
          ? {
            message: typeof ast.error.message === 'string'
              ? ast.error.message
              : JSON.stringify(ast.error.message || ast.error),
            stack: ast.error.stack,
          }
          : undefined,
      });

      logger.info('工作流运行实例执行完成', {
        runId,
        status: ast.state,
      });

      // 返回更新后的运行实例
      const updatedRun = await this.workflowRunService.getRun(runId);
      return updatedRun!;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      logger.error('工作流运行实例执行失败', {
        runId,
        error: message,
        stack,
      });

      // 更新运行状态为失败
      await this.workflowRunService.completeRun(runId, {
        success: false,
        error: {
          message: message || '执行失败',
          stack: process.env.NODE_ENV === 'development' ? stack : undefined,
        },
      });

      // 返回更新后的运行实例
      const updatedRun = await this.workflowRunService.getRun(runId);
      return updatedRun!;
    }
  }

  /**
   * 获取运行实例详情
   *
   * 优雅设计：
   * - 返回完整的运行状态和数据
   * - 包括输入、输出、节点状态、错误信息
   */
  async getRun(runId: string): Promise<WorkflowRunEntity> {
    if (!runId) {
      throw new BadRequestException('运行实例 ID 不能为空');
    }

    const run = await this.workflowRunService.getRun(runId);

    if (!run) {
      throw new NotFoundException(`运行实例不存在: ${runId}`);
    }

    return run;
  }

  /**
   * 列出工作流的运行历史
   *
   * 优雅设计：
   * - 支持分页查询
   * - 支持按状态过滤
   * - 按创建时间倒序排列
   * - 返回总数和当前页数据
   */
  async listRuns(
    query: {
      workflowId: string;
      page?: number;
      pageSize?: number;
      status?: RunStatus;
    },
  ): Promise<{ runs: WorkflowRunEntity[]; total: number; page: number; pageSize: number }> {
    const { workflowId, page = 1, pageSize = 20, status } = query;

    if (!workflowId) {
      throw new BadRequestException('工作流 ID 不能为空');
    }

    const result = await this.workflowRunService.listRuns(workflowId, {
      page,
      pageSize,
      status,
    });

    return {
      ...result,
      page,
      pageSize,
    };
  }

  /**
   * 取消运行实例
   *
   * 优雅设计：
   * - 只能取消 PENDING 或 RUNNING 状态的运行
   * - 记录取消时间
   */
  async cancelRun(body: { runId: string }): Promise<{ success: boolean }> {
    const { runId } = body;

    if (!runId) {
      throw new BadRequestException('运行实例 ID 不能为空');
    }

    try {
      await this.workflowRunService.cancelRun(runId);

      logger.info('运行实例已取消', { runId });

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('取消运行实例失败', {
        runId,
        error: message,
      });

      throw new BadRequestException(message);
    }
  }
}
