import { Controller, Body, BadRequestException, Query, NotFoundException, Param } from '@sker/core';
import { Observable } from 'rxjs';
import { Ast, fromJson, generateId, INode, resolveConstructor, type OutputMetadata, type INodeOutputMetadata, getNodeById, executeAstWithWorkflowGraph, executeWorkflowImmediate, NodeEvent, executeAst } from '@sker/workflow';
import { WorkflowGraphAst } from '@sker/workflow';
import { logger, root } from '@sker/core';
import * as sdk from '@sker/sdk';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowRunService } from '../services/workflow-run.service';
import { WorkflowTemplateService } from '../services/workflow-template.service';
import { WorkflowScheduleService } from '../services/workflow-schedule.service';
import { WorkflowEntity, WorkflowRunEntity, RunStatus, WorkflowScheduleEntity, ScheduleType, ScheduleStatus } from '@sker/entities';

/**
 * 爬虫工作流触发控制器
 *
 * 存在即合理：
 * - 提供优雅的API端点触发爬虫工作流
 * - 支持多种触发方式：NLP分析、微博搜索
 * - 集成消息队列，确保任务可靠执行
 * - 管理工作流的持久化和分享
 */
@Controller(sdk.WorkflowController)
export class WorkflowController implements sdk.WorkflowController {
  private readonly workflowService: WorkflowService;
  private readonly workflowRunService: WorkflowRunService;
  private readonly workflowTemplateService: WorkflowTemplateService;
  private readonly workflowScheduleService: WorkflowScheduleService;

  constructor() {
    this.workflowService = root.get(WorkflowService);
    this.workflowRunService = root.get(WorkflowRunService);
    this.workflowTemplateService = root.get(WorkflowTemplateService);
    this.workflowScheduleService = root.get(WorkflowScheduleService);
  }

  /**
   * 保存工作流
   *
   * 优雅设计：
   * - 委托给 WorkflowService 处理业务逻辑
   * - 统一的参数验证和异常处理
   */
  async saveWorkflow(@Body() body: WorkflowGraphAst): Promise<WorkflowEntity> {
    const { name, edges, nodes } = body;

    if (!name || name.trim().length === 0) {
      throw new BadRequestException('工作流名称不能为空');
    }

    if (!nodes || !edges) {
      throw new BadRequestException('工作流数据格式错误');
    }
    body.id = body.id || generateId()
    return await this.workflowService.saveWorkflow(body);
  }

  async initWorkflow(@Query() params: { name: string }): Promise<sdk.InitWorkflowResponse> {
    const { name } = params;
    // 2. 检查是否有对应的模板
    const template = this.workflowTemplateService.createFromTemplate(name);

    if (template) {
      await this.saveWorkflow(template);
      return { template };
    }

    return {};
  }

  /**
   * 根据 name 获取工作流
   *
   * 优雅设计：
   * - 支持从模板自动创建工作流
   * - 如果存在则返回，不存在则检查是否有模板
   * - 有模板则使用模板初始化，无模板则创建空工作流
   */
  async getWorkflow(@Query() params: { name: string }): Promise<WorkflowGraphAst | null> {
    const { name } = params;
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('工作流名称不能为空');
    }
    // 1. 尝试从数据库获取现有工作流
    const workflow = await this.workflowService.getWorkflowByName(name);
    if (workflow) {
      return workflow;
    }
    // 3. 无模板，创建空工作流
    logger.info('创建空工作流', { name });
    const workflowAst = new WorkflowGraphAst();
    workflowAst.name = name;
    await this.saveWorkflow(workflowAst);
    return workflowAst;
  }

  /**
   * 列出所有可用的工作流模板
   *
   * 优雅设计：
   * - 让用户知道有哪些预定义模板可以使用
   * - 提供模板描述，帮助用户选择合适的模板
   */
  async listTemplates(): Promise<{ name: string; description: string }[]> {
    const templates = this.workflowTemplateService.getAvailableTemplates();

    return templates.map(name => ({
      name,
      description: this.workflowTemplateService.getTemplateDescription(name)
    }));
  }

  /**
   * 列出所有工作流
   */
  async listWorkflows(): Promise<sdk.WorkflowSummary[]> {
    return await this.workflowService.listWorkflows();
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(@Query() params: { id: string }): Promise<{ success: boolean }> {
    const { id } = params;

    if (!id || id.trim().length === 0) {
      throw new BadRequestException('工作流ID不能为空');
    }

    const success = await this.workflowService.deleteWorkflow(id);

    if (!success) {
      throw new NotFoundException('工作流不存在');
    }

    return { success };
  }

  /**
   * 执行工作流 - POST SSE版本
   *
   * 支持两种执行模式：
   * 1. 执行完整工作流：传递 workflow 字段
   * 2. 执行单个节点：传递 ast 字段（在 workflow 上下文中执行）
   */
  execute(
    @Body() body: sdk.ExecuteWorkflowPayload,
  ): Observable<NodeEvent> {

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
      let mode: string;

      if (workflowJson && ast) {
        // 场景1：同时提供 workflow 和 ast → 在工作流上下文中执行单个节点
        mode = 'node-in-workflow';
        target = fromJson(ast);
        parent = fromJson(workflowJson) as WorkflowGraphAst;
      } else if (workflowJson) {
        // 场景2：只提供 workflow → 执行整个工作流
        mode = 'workflow';
        target = fromJson(workflowJson) as WorkflowGraphAst;
        parent = undefined;
      } else {
        // 场景3：只提供 ast → 独立执行单个节点
        mode = 'node';
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
  executeNode(
    @Body() body: { workflow: INode, nodeId: string, config?: any }
  ): Observable<NodeEvent> {
    try {
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
    } catch (error: unknown) {
      throw error;
    }
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
    @Body() body: { workflowId: string; inputs?: Record<string, unknown> },
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
  async executeRun(@Body() body: { runId: string }): Promise<WorkflowRunEntity> {
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
            outputs: this.extractNodeOutputs(node),
          };
        });
      }
      logger.info('节点状态', { nodeStates: Object.keys(nodeStates) });

      // 提取工作流输出
      const outputs = this.extractWorkflowOutputs(ast);

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
  async getRun(@Param('runId') runId: string): Promise<WorkflowRunEntity> {
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
    @Query()
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
  async cancelRun(@Body() body: { runId: string }): Promise<{ success: boolean }> {
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
    @Param('runId') runId: string,
    @Param('nodeId') nodeId: string,
    @Body() body: { config: any },
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


  /**
   * 提取节点输出 - 基于 @Output 装饰器元数据
   *
   * 优雅设计：
   * - 只提取 @Output 装饰的属性
   * - 通过元数据确保输出结构的明确性
   * - 避免提取内部状态和配置属性
   */
  private extractNodeOutputs(node: INode): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};

    try {
      // 获取节点的构造函数
      const ctor = resolveConstructor(node);

      // ✨使用编译后的 node.metadata.outputs，不再依赖装饰器
      const nodeOutputs = node.metadata?.outputs || [];

      // 提取输出属性的值
      nodeOutputs.forEach((meta: INodeOutputMetadata) => {
        const propertyKey = meta.property as string;
        const value = node[propertyKey];

        if (value !== undefined) {
          outputs[propertyKey] = value;
        }
      });
    } catch (error) {
      logger.error('提取节点输出失败', {
        nodeId: node.id,
        nodeType: node.type,
        error: (error as Error).message
      });
    }

    return outputs;
  }

  /**
   * 提取工作流输出 - 只收集输出节点的结果
   *
   * 优雅设计：
   * - 找到所有没有后续连线的节点（出度为 0）
   * - 这些节点被视为工作流的输出节点
   * - 收集输出节点的 @Output 属性值
   * - 以节点 ID 为 key 组织输出
   */
  private extractWorkflowOutputs(ast: WorkflowGraphAst): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};

    if (!ast.nodes || !ast.edges) {
      return outputs;
    }

    // 构建出度映射：记录每个节点有多少条出边
    const outDegree = new Map<string, number>();
    ast.nodes.forEach(node => outDegree.set(node.id, 0));

    ast.edges.forEach(edge => {
      const count = outDegree.get(edge.from) || 0;
      outDegree.set(edge.from, count + 1);
    });

    // 找到所有出度为 0 的节点（输出节点）
    const outputNodes = ast.nodes.filter(node => {
      const degree = outDegree.get(node.id) || 0;
      return degree === 0 && node.state === 'success';
    });

    // 收集输出节点的结果
    outputNodes.forEach(node => {
      const nodeOutputs = this.extractNodeOutputs(node);

      if (Object.keys(nodeOutputs).length > 0) {
        outputs[node.id] = {
          nodeType: node.type,
          nodeName: (node as { name?: string }).name || node.id,
          outputs: nodeOutputs
        };
      }
    });

    return outputs;
  }

  // ========== 调度相关方法 ==========

  /**
   * 创建调度
   */
  async createSchedule(
    body: {
      code: string;
      name: string;
      scheduleType: string;
      cronExpression?: string;
      intervalSeconds?: number;
      inputs?: Record<string, unknown>;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<WorkflowScheduleEntity> {
    if (!body.name) {
      throw new BadRequestException('工作流名称不能为空')
    }

    return this.workflowScheduleService.createSchedule({
      workflowName: body.code,
      name: body.name,
      scheduleType: body.scheduleType as ScheduleType,
      cronExpression: body.cronExpression,
      intervalSeconds: body.intervalSeconds,
      inputs: body.inputs || {},
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    })
  }

  /**
   * 列出调度
   */
  async listSchedules(@Param('name') workflowName: string): Promise<WorkflowScheduleEntity[]> {
    return this.workflowScheduleService.listSchedules(workflowName)
  }

  /**
   * 获取调度详情
   */
  async getSchedule(@Param('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.workflowScheduleService.getSchedule(scheduleId)
  }

  /**
   * 更新调度
   */
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() body: {
      name?: string;
      scheduleType?: string;
      cronExpression?: string;
      intervalSeconds?: number;
      inputs?: Record<string, unknown>;
      startTime?: Date;
      endTime?: Date;
      status?: string;
    }
  ): Promise<WorkflowScheduleEntity> {
    return this.workflowScheduleService.updateSchedule(scheduleId, {
      ...body,
      scheduleType: body.scheduleType as ScheduleType,
      status: body.status as ScheduleStatus,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    })
  }

  /**
   * 删除调度
   */
  async deleteSchedule(@Param('scheduleId') scheduleId: string): Promise<{ success: boolean }> {
    await this.workflowScheduleService.deleteSchedule(scheduleId)
    return { success: true }
  }

  /**
   * 启用调度
   */
  async enableSchedule(@Param('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.workflowScheduleService.enableSchedule(scheduleId)
  }

  /**
   * 禁用调度
   */
  async disableSchedule(@Param('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.workflowScheduleService.disableSchedule(scheduleId)
  }

  /**
   * 手动触发调度
   *
   * 优雅设计：
   * - 为手动类型调度提供即时触发能力
   * - 支持动态传递运行参数（覆盖调度中保存的参数）
   * - 创建运行实例后立即返回 runId，不等待执行完成
   * - 后台异步执行，避免长时间阻塞请求
   * - 返回运行实例 ID，用于追踪执行状态
   */
  async triggerSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() body?: { inputs?: Record<string, unknown> }
  ): Promise<{ success: boolean; runId: string }> {
    if (!scheduleId) {
      throw new BadRequestException('调度 ID 不能为空')
    }

    const schedule = await this.workflowScheduleService.getSchedule(scheduleId)

    if (!schedule) {
      throw new NotFoundException(`调度不存在: ${scheduleId}`)
    }

    // 优先使用请求中的 inputs，否则使用调度保存的 inputs
    const inputs = body?.inputs ?? schedule.inputs

    logger.info('手动触发调度', {
      scheduleId,
      workflowId: schedule.workflowId,
      hasCustomInputs: !!body?.inputs
    })

    // 创建运行实例（直接使用 workflowId）
    const run = await this.workflowRunService.createRun(schedule.workflowId, inputs, scheduleId)

    // 更新调度的最后运行时间
    await this.workflowScheduleService.updateLastRunTime(scheduleId)

    // 异步执行，不等待结果
    setImmediate(() => {
      this.executeRun({ runId: run.id }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('异步执行工作流失败', { runId: run.id, error: message })
      })
    })

    return {
      success: true,
      runId: run.id
    }
  }

  /**
   * 获取所有可用节点类型
   *
   * 优雅设计：
   * - 遍历所有已注册的节点类型
   * - 提取节点元数据（标题、类型等）
   * - 返回统一的节点信息列表
   */
  async getAvailableNodes(): Promise<sdk.WorkflowNodeInfo[]> {
    const { NODE } = await import('@sker/workflow');
    const nodeMetadatas = root.get(NODE, []);

    return nodeMetadatas.map((metadata: { target: { name: string }; title?: string; type?: string; description?: string }) => ({
      type: metadata.target.name,
      title: metadata.title || metadata.target.name,
      nodeType: metadata.type || 'basic',
      description: metadata.description,
    }));
  }
}