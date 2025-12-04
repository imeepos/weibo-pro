import { Controller, Post, Body, Get, BadRequestException, Query, Delete, NotFoundException, Sse, Res, Param, Put } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Ast, executeAst, fromJson, generateId, INode, OUTPUT, resolveConstructor, OutputMetadata } from '@sker/workflow';
import { WorkflowGraphAst, ReactiveScheduler } from '@sker/workflow';
import { logger, root } from '@sker/core';
import * as sdk from '@sker/sdk';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowRunService } from '../services/workflow-run.service';
import { WorkflowTemplateService } from '../services/workflow-template.service';
import { WorkflowScheduleService } from '../services/workflow-schedule.service';
import { WorkflowEntity, WorkflowRunEntity, RunStatus, WorkflowScheduleEntity } from '@sker/entities';

/**
 * 爬虫工作流触发控制器
 *
 * 存在即合理：
 * - 提供优雅的API端点触发爬虫工作流
 * - 支持多种触发方式：NLP分析、微博搜索
 * - 集成消息队列，确保任务可靠执行
 * - 管理工作流的持久化和分享
 */
@Controller('api/workflow')
export class WorkflowController implements sdk.WorkflowController {
  private readonly workflowService: WorkflowService;
  private readonly workflowRunService: WorkflowRunService;
  private readonly workflowTemplateService: WorkflowTemplateService;
  private readonly workflowScheduleService: WorkflowScheduleService;
  private readonly reactiveScheduler: ReactiveScheduler;

  constructor() {
    this.workflowService = root.get(WorkflowService);
    this.workflowRunService = root.get(WorkflowRunService);
    this.workflowTemplateService = root.get(WorkflowTemplateService);
    this.workflowScheduleService = root.get(WorkflowScheduleService);
    this.reactiveScheduler = root.get(ReactiveScheduler);
  }

  /**
   * 保存工作流
   *
   * 优雅设计：
   * - 委托给 WorkflowService 处理业务逻辑
   * - 统一的参数验证和异常处理
   */
  @Post('save')
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

  @Get('init')
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
  @Get('get')
  async getWorkflow(@Query() params: { name: string }): Promise<WorkflowGraphAst | null> {
    const { name } = params;
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('工作流名称不能为空');
    }
    // 1. 尝试从数据库获取现有工作流
    const workflow = await this.workflowService.getWorkflowByName(name);
    if (workflow) {
      logger.info('工作流已存在', { name });
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
  @Get('templates')
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
  @Get('list')
  async listWorkflows(): Promise<sdk.WorkflowSummary[]> {
    return await this.workflowService.listWorkflows();
  }

  /**
   * 删除工作流
   */
  @Delete('delete/:id')
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
   * 执行单个节点 - POST SSE版本
   *
   * 优雅设计：
   * - 支持POST方法传递复杂JSON数据
   * - 手动返回text/event-stream SSE实时推送
   * - 从工作流数据中反序列化节点
   * - 执行指定节点，实时推送执行进度
   * - 妥善处理所有错误，确保服务稳定
   */
  @Post('execute')
  execute(@Body() body: Ast, @Res() res?: any): Observable<Ast> {
    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    try {
      const ast = fromJson(body) as Ast;

      // 执行工作流并发送实时事件 (executeAst 内部会自动设置 running 状态)
      const subscription$ = executeAst(ast, ast as WorkflowGraphAst)
      const subscription = subscription$.subscribe({
        next: (workflow: Ast) => {
          // 发送工作流状态更新事件
          res.write(`data: ${JSON.stringify(workflow)}\n\n`);
        },
        error: (error: any) => {
          res.end();
        },
        complete: () => {
          res.end();
        }
      });

      // 处理客户端断开连接
      res.on('close', () => {
        subscription.unsubscribe();
      });

      return subscription$;
    } catch (error: any) {
      console.error(`execute error: `, { error, body });
      res.end();
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
  @Post('executeNode')
  @Sse()
  executeNode(
    @Body() body: { workflow: INode, nodeId: string, config?: any },
    @Res() res?: any
  ): Observable<WorkflowGraphAst> {
    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    try {
      const { workflow, nodeId, config } = body;

      if (!workflow || !nodeId) {
        throw new BadRequestException('工作流数据和节点ID不能为空');
      }

      logger.info('开始执行单个节点', { nodeId, config });

      // 发送开始事件
      res.write(`data: ${JSON.stringify({
        type: 'node_execution_started',
        nodeId,
        timestamp: new Date().toISOString()
      })}\n\n`);

      // 反序列化工作流图
      const workflowAst = fromJson(workflow) as WorkflowGraphAst;

      // 找到要执行的节点
      const targetNode = workflowAst.nodes.find(n => n.id === nodeId);
      if (!targetNode) {
        throw new BadRequestException(`节点不存在: ${nodeId}`);
      }

      // 如果提供了配置，应用到节点上
      if (config) {
        Object.keys(config).forEach(key => {
          (targetNode as any)[key] = config[key];
        });
        logger.info('应用节点配置', { nodeId, config });
      }

      // 设置节点初始状态
      targetNode.state = 'running';
      targetNode.error = undefined;

      // 发送状态更新
      res.write(`data: ${JSON.stringify({
        type: 'state_changed',
        nodeId,
        state: 'running'
      })}\n\n`);

      // 使用 fineTuneNode 进行智能微调 - 只需传入工作流和节点ID
      const nodeExecution$ = this.reactiveScheduler.fineTuneNode(
        workflowAst,
        nodeId
      );

      const subscription = nodeExecution$.subscribe({
        next: (updatedWorkflow: WorkflowGraphAst) => {
          // 找到执行后的节点状态
          const executedNode = updatedWorkflow.nodes.find(n => n.id === nodeId);

          logger.debug('节点执行状态更新', {
            nodeId: nodeId,
            state: executedNode?.state
          });

          // 发送执行进度 - 包含完整的工作流状态
          res.write(`data: ${JSON.stringify({
            type: 'progress',
            workflow: updatedWorkflow,
            node: executedNode,
            timestamp: new Date().toISOString()
          })}\n\n`);
        },
        error: (error: any) => {
          logger.error('节点执行失败', { nodeId, error: error.message });

          // 发送错误事件
          res.write(`data: ${JSON.stringify({
            type: 'error',
            nodeId,
            error: {
              message: error.message,
              stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            timestamp: new Date().toISOString()
          })}\n\n`);

          res.end();
        },
        complete: () => {
          logger.info('节点执行完成', { nodeId });

          // 发送完成事件
          res.write(`data: ${JSON.stringify({
            type: 'complete',
            nodeId,
            timestamp: new Date().toISOString()
          })}\n\n`);

          res.end();
        }
      });

      // 处理客户端断开连接
      res.on('close', () => {
        logger.info('客户端断开连接', { nodeId });
        subscription.unsubscribe();
      });

      return nodeExecution$;

    } catch (error: any) {
      logger.error('执行单个节点失败', { nodeId: body?.nodeId, error: error.message });

      // 发送错误事件
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        timestamp: new Date().toISOString()
      })}\n\n`);

      res.end();
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
  @Post(':id/runs')
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
  @Post('runs/:runId/execute')
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
      const ast = fromJson(run.graphSnapshot);

      logger.info('开始执行工作流运行实例', {
        runId,
        workflowId: run.workflowId,
        inputs: run.inputs,
      });

      // 执行工作流（传入 inputs 作为上下文）
      const result = await executeAst(ast, ast as WorkflowGraphAst).toPromise();

      // 提取节点状态
      const nodeStates: Record<string, unknown> = {};
      if (result.nodes) {
        result.nodes.forEach((node: any) => {
          nodeStates[node.id] = {
            state: node.state,
            error: node.error,
            // 保存节点的输出数据
            outputs: this.extractNodeOutputs(node),
          };
        });
      }

      // 提取工作流输出
      const outputs = this.extractWorkflowOutputs(result);

      // 完成运行
      await this.workflowRunService.completeRun(runId, {
        success: result.state === 'success',
        outputs,
        nodeStates,
        error: result.error
          ? {
            message: typeof result.error.message === 'string'
              ? result.error.message
              : JSON.stringify(result.error.message || result.error),
            stack: result.error.stack,
          }
          : undefined,
      });

      logger.info('工作流运行实例执行完成', {
        runId,
        status: result.state,
      });

      // 返回更新后的运行实例
      const updatedRun = await this.workflowRunService.getRun(runId);
      return updatedRun!;
    } catch (error: any) {
      logger.error('工作流运行实例执行失败', {
        runId,
        error: error.message,
        stack: error.stack,
      });

      // 更新运行状态为失败
      await this.workflowRunService.completeRun(runId, {
        success: false,
        error: {
          message: error.message || '执行失败',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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
  @Get('runs/:runId')
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
  @Get(':id/runs')
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
  @Post('runs/:runId/cancel')
  async cancelRun(@Body() body: { runId: string }): Promise<{ success: boolean }> {
    const { runId } = body;

    if (!runId) {
      throw new BadRequestException('运行实例 ID 不能为空');
    }

    try {
      await this.workflowRunService.cancelRun(runId);

      logger.info('运行实例已取消', { runId });

      return { success: true };
    } catch (error: any) {
      logger.error('取消运行实例失败', {
        runId,
        error: error.message,
      });

      throw new BadRequestException(error.message);
    }
  }

  /**
   * 节点微调 - 基于响应式流的智能重放
   *
   * 核心机制：
   * - 利用 BehaviorSubject 创建配置变更流
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
  @Post('runs/:runId/fine-tune/:nodeId')
  @Sse()
  fineTuneNode(
    @Param('runId') runId: string,
    @Param('nodeId') nodeId: string,
    @Body() body: { config: any },
    @Res() res?: any
  ): Observable<WorkflowGraphAst> {
    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    try {
      logger.info('开始节点微调', { runId, nodeId, config: body.config });

      // 获取运行实例
      const runPromise = this.workflowRunService.getRun(runId);

      return new Observable(observer => {
        runPromise.then(run => {
          if (!run) {
            const error = new NotFoundException(`运行实例不存在: ${runId}`);
            observer.error(error);
            res.end();
            return;
          }

          // 反序列化工作流 AST
          const ast = fromJson(run.graphSnapshot) as WorkflowGraphAst;

          // 如果提供了配置，应用到目标节点
          if (body.config) {
            const targetNode = ast.nodes.find(n => n.id === nodeId);
            if (targetNode) {
              Object.keys(body.config).forEach(key => {
                (targetNode as any)[key] = body.config[key];
              });
              logger.info('应用节点配置', { nodeId, config: body.config });
            }
          }

          // 发送开始事件
          res.write(`data: ${JSON.stringify({ type: 'fine_tune_started', nodeId, config: body.config })}

`);

          // 执行节点微调 - 只需传入 AST 和节点ID
          const fineTune$ = this.reactiveScheduler.fineTuneNode(ast, nodeId);

          const subscription = fineTune$.subscribe({
            next: (updatedAst: WorkflowGraphAst) => {
              // 发送进度更新
              res.write(`data: ${JSON.stringify({
                type: 'progress',
                workflow: updatedAst,
                affectedNodes: Array.from(this.findAffectedNodesIds(ast, nodeId))
              })}

`);
            },
            error: (error: any) => {
              logger.error('节点微调失败', { runId, nodeId, error: error.message });
              res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}

`);
              res.end();
              observer.error(error);
            },
            complete: () => {
              logger.info('节点微调完成', { runId, nodeId });
              res.write(`data: ${JSON.stringify({ type: 'complete' })}

`);
              res.end();
              observer.complete();
            }
          });

          // 处理客户端断开连接
          res.on('close', () => {
            subscription.unsubscribe();
          });
        }).catch(error => {
          logger.error('获取运行实例失败', { runId, error: error.message });
          res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}

`);
          res.end();
          observer.error(error);
        });
      });
    } catch (error: any) {
      logger.error('节点微调初始化失败', { runId, nodeId, error: error.message });
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}

`);
      res.end();
      throw error;
    }
  }

  /**
   * 查找受影响节点的辅助方法
   */
  private findAffectedNodesIds(ast: WorkflowGraphAst, changedNodeId: string): Set<string> {
    const affected = new Set<string>();
    const visited = new Set<string>();

    const findDownstream = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      affected.add(nodeId);
      const downstreamEdges = ast.edges.filter(edge => edge.from === nodeId);
      for (const edge of downstreamEdges) {
        findDownstream(edge.to);
      }
    };

    findDownstream(changedNodeId);
    return affected;
  }

  /**
   * 提取节点输出 - 基于 @Output 装饰器元数据
   *
   * 优雅设计：
   * - 只提取 @Output 装饰的属性
   * - 通过元数据确保输出结构的明确性
   * - 避免提取内部状态和配置属性
   */
  private extractNodeOutputs(node: any): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};

    try {
      // 获取节点的构造函数
      const ctor = resolveConstructor(node);

      // 获取所有 @Output 元数据
      const allOutputs = root.get<OutputMetadata[]>(OUTPUT, []);

      // 过滤出当前节点类型的输出属性
      const nodeOutputs = allOutputs.filter(meta => meta.target === ctor);

      // 提取输出属性的值
      nodeOutputs.forEach(meta => {
        const propertyKey = meta.propertyKey as string;
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
          nodeName: (node as any).name || node.id,
          outputs: nodeOutputs
        };
      }
    });

    return outputs;
  }

  /**
   * 提取节点配置 - 从节点对象中提取可配置的属性
   *
   * 智能提取：
   * - 排除系统属性（id, type, state, error, position 等）
   * - 提取业务相关的配置属性
   * - 支持嵌套对象配置
   */
  private extractNodeConfig(node: INode): Record<string, any> {
    const systemKeys = ['id', 'type', 'state', 'error', 'position', 'name', 'description'];
    const config: Record<string, any> = {};

    Object.keys(node).forEach(key => {
      if (!systemKeys.includes(key) && node[key] !== undefined) {
        config[key] = node[key];
      }
    });

    return config;
  }

  // ========== 调度相关方法 ==========

  /**
   * 创建调度
   */
  @Post(':name/schedules')
  async createSchedule(
    @Param('name') workflowName: string,
    @Body() body: {
      name: string;
      scheduleType: string;
      cronExpression?: string;
      intervalSeconds?: number;
      inputs?: Record<string, unknown>;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<WorkflowScheduleEntity> {
    if (!workflowName) {
      throw new BadRequestException('工作流名称不能为空')
    }

    return this.workflowScheduleService.createSchedule({
      workflowName,
      name: body.name,
      scheduleType: body.scheduleType as any,
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
  @Get(':name/schedules')
  async listSchedules(@Param('name') workflowName: string): Promise<WorkflowScheduleEntity[]> {
    return this.workflowScheduleService.listSchedules(workflowName)
  }

  /**
   * 获取调度详情
   */
  @Get('schedules/:scheduleId')
  async getSchedule(@Param('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.workflowScheduleService.getSchedule(scheduleId)
  }

  /**
   * 更新调度
   */
  @Put('schedules/:scheduleId')
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
      scheduleType: body.scheduleType as any,
      status: body.status as any,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    })
  }

  /**
   * 删除调度
   */
  @Delete('schedules/:scheduleId')
  async deleteSchedule(@Param('scheduleId') scheduleId: string): Promise<{ success: boolean }> {
    await this.workflowScheduleService.deleteSchedule(scheduleId)
    return { success: true }
  }

  /**
   * 启用调度
   */
  @Post('schedules/:scheduleId/enable')
  async enableSchedule(@Param('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.workflowScheduleService.enableSchedule(scheduleId)
  }

  /**
   * 禁用调度
   */
  @Post('schedules/:scheduleId/disable')
  async disableSchedule(@Param('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.workflowScheduleService.disableSchedule(scheduleId)
  }

  /**
   * 手动触发调度
   *
   * 优雅设计：
   * - 为手动类型调度提供即时触发能力
   * - 创建运行实例并立即执行
   * - 返回运行实例 ID，用于追踪执行状态
   */
  @Post('schedules/:scheduleId/trigger')
  async triggerSchedule(
    @Param('scheduleId') scheduleId: string
  ): Promise<{ success: boolean; runId: string; run: WorkflowRunEntity }> {
    if (!scheduleId) {
      throw new BadRequestException('调度 ID 不能为空')
    }

    const schedule = await this.workflowScheduleService.getSchedule(scheduleId)

    if (!schedule) {
      throw new NotFoundException(`调度不存在: ${scheduleId}`)
    }

    logger.info('手动触发调度', { scheduleId, workflowId: schedule.workflowId })

    // 创建运行实例（直接使用 workflowId）
    const run = await this.workflowRunService.createRun(schedule.workflowId, schedule.inputs, scheduleId)

    // 更新调度的最后运行时间
    await this.workflowScheduleService.updateLastRunTime(scheduleId)

    // 立即执行
    const executedRun = await this.executeRun({ runId: run.id })

    return {
      success: true,
      runId: run.id,
      run: executedRun
    }
  }
}