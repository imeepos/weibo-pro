import { BadRequestException, NotFoundException, logger, root } from '@sker/core';
import { Observable } from 'rxjs';
import {
  fromJson,
  INode,
  executeAstWithWorkflowGraph,
  executeAst,
  NodeEvent,
  getNodeById,
  WorkflowGraphAst,
} from '@sker/workflow';
import * as sdk from '@sker/sdk';
import { WorkflowRunService } from '../../services/workflow-run.service';

/**
 * 工作流执行处理器（SSE）
 *
 * 存在即合理：
 * - 支持多种执行模式：完整工作流、单节点、工作流上下文中的单节点
 * - 节点微调基于响应式流智能重放
 */
export class WorkflowExecuteHandler {
  private readonly workflowRunService: WorkflowRunService;

  constructor() {
    this.workflowRunService = root.get(WorkflowRunService);
  }

  /**
   * 执行工作流 - 支持两种执行模式：
   * 1. 执行完整工作流：传递 workflow 字段
   * 2. 执行单个节点：传递 ast 字段（在 workflow 上下文中执行）
   */
  execute(body: sdk.ExecuteWorkflowPayload): Observable<NodeEvent> {
    try {
      // 添加 body 验证
      if (!body) {
        throw new BadRequestException('请求体不能为空');
      }

      const { ast, workflow: workflowJson, input = {} } = body;

      if (!workflowJson && !ast) {
        throw new BadRequestException('必须提供 workflow 或 ast 字段');
      }

      // 明确区分三种执行场景
      let target: INode;
      let parent: WorkflowGraphAst | undefined;
      let _mode: string;

      if (workflowJson && ast) {
        // 场景1：同时提供 workflow 和 ast → 在工作流上下文中执行单个节点
        _mode = 'node-in-workflow';
        target = fromJson(ast);
        parent = fromJson(workflowJson) as WorkflowGraphAst;
      } else if (workflowJson) {
        // 场景2：只提供 workflow → 执行整个工作流
        _mode = 'workflow';
        target = fromJson(workflowJson) as WorkflowGraphAst;
        parent = undefined;
      } else {
        // 场景3：只提供 ast → 独立执行单个节点
        _mode = 'node';
        target = fromJson(ast!);
        parent = undefined;
      }

      const events$ = executeAst(target, input, parent);
      return events$;
    } catch (error: unknown) {
      logger.error('execute error', { error: error instanceof Error ? error.message : String(error), body });
      throw error;
    }
  }

  /**
   * 微调执行工作流的一个节点 - 轻量级单节点执行
   *
   * 优雅设计：
   * - 支持直接执行工作流中的单个节点
   * - 使用 SSE 实时推送执行状态和结果
   * - 智能处理节点输入数据
   * - 支持节点配置微调
   * - 错误隔离，不影响其他节点
   */
  executeNode(body: { workflow: INode, nodeId: string, config?: any }): Observable<NodeEvent> {
    const { workflow, nodeId, config } = body;

    if (!workflow || !nodeId) {
      throw new BadRequestException('工作流数据和节点ID不能为空');
    }

    logger.info('开始执行单个节点', { nodeId, config });

    // 反序列化工作流图
    const workflowAst = fromJson(workflow) as WorkflowGraphAst;

    // 找到要执行的节点（支持递归查找组节点内部）
    const targetNode = getNodeById(workflowAst.nodes, nodeId);
    if (!targetNode) {
      throw new BadRequestException(`节点不存在: ${nodeId}`);
    }

    // 如果提供了配置，应用到节点上
    if (config) {
      Object.keys(config).forEach(key => {
        (targetNode as Record<string, unknown>)[key] = config[key];
      });
      logger.info('应用节点配置', { nodeId, config });
    }

    // 设置节点初始状态
    targetNode.state = 'running';
    targetNode.error = undefined;
    return executeAstWithWorkflowGraph(targetNode, {}, workflowAst);
  }

  /**
   * 节点微调 - 基于响应式流的智能重放
   *
   * 核心机制：
   * - 识别受影响的节点及其下游依赖
   * - 重用未受影响节点的 shareReplay 缓存
   * - 重新执行受影响节点流
   * - 合并结果并更新工作流状态
   *
   * 优雅设计：
   * - 支持实时 SSE 推送执行进度
   * - 智能依赖分析，只重执行必要节点
   * - 流式缓存复用，避免重复计算
   * - 错误隔离，单个节点失败不影响整体
   */
  fineTuneNode(
    runId: string,
    nodeId: string,
    body: { config: any },
  ): Observable<NodeEvent> {
    try {
      logger.info('开始节点微调', { runId, nodeId, config: body.config });

      // 获取运行实例
      const runPromise = this.workflowRunService.getRun(runId);

      return new Observable(observer => {
        runPromise.then(run => {
          if (!run) {
            const error = new NotFoundException(`运行实例不存在: ${runId}`);
            observer.error(error);
            return;
          }

          // 反序列化工作流 AST
          const ast = fromJson(run.graphSnapshot) as WorkflowGraphAst;

          // 如果提供了配置，应用到目标节点
          if (body.config) {
            const targetNode = getNodeById(ast.nodes, nodeId);
            if (targetNode) {
              Object.keys(body.config).forEach(key => {
                (targetNode as Record<string, unknown>)[key] = body.config[key];
              });
              logger.info('应用节点配置', { nodeId, config: body.config });
            }
          }

          // ✅ 执行时会自动发送 node_runing 事件，无需手动发送
          // 使用 executeAstWithWorkflowGraph 执行节点微调
          const targetNode = getNodeById(ast.nodes, nodeId);
          if (!targetNode) {
            const error = new NotFoundException(`节点不存在: ${nodeId}`);
            observer.error(error);
            return;
          }
          const fineTune$ = executeAstWithWorkflowGraph(targetNode, {}, ast);
          return fineTune$.subscribe(observer);
        }).catch(error => {
          logger.error('获取运行实例失败', { runId, error: error.message });
          observer.error(error);
        });
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('节点微调初始化失败', { runId, nodeId, error: message });
      throw error;
    }
  }
}
