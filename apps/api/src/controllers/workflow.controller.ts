import { Controller, Post, Body, Get, BadRequestException, Query, Delete, NotFoundException, Sse, Res } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Ast, executeAst, fromJson, INode } from '@sker/workflow';
import { WorkflowGraphAst } from '@sker/workflow';
import { logger } from '../utils/logger';
import * as sdk from '@sker/sdk';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowRunService } from '../services/workflow-run.service';
import { WorkflowTemplateService } from '../services/workflow-template.service';
import { root } from '@sker/core';
import { WorkflowEntity, WorkflowRunEntity, RunStatus } from '@sker/entities';

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

  constructor() {
    this.workflowService = root.get(WorkflowService);
    this.workflowRunService = root.get(WorkflowRunService);
    this.workflowTemplateService = root.get(WorkflowTemplateService);
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
    const { name, id, edges, nodes } = body;

    if (!name || name.trim().length === 0) {
      throw new BadRequestException('工作流名称不能为空');
    }

    if (!nodes || !edges) {
      throw new BadRequestException('工作流数据格式错误');
    }

    return await this.workflowService.saveWorkflow(body);
  }

  @Get('init')
  async initWorkflow(@Query() params: { name: string }) {
    const { name } = params;
    // 2. 检查是否有对应的模板
    const template = this.workflowTemplateService.createFromTemplate(name);

    if (template) {
      await this.saveWorkflow(template);
      return template;
    }
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
  execute(@Body() body: Ast, @Res() res?: any): Observable<INode> {
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
      ast.state = 'running';
      // 发送开始事件
      res.write(`data: ${JSON.stringify(ast)}\n\n`);

      // 执行工作流并发送实时事件
      const subscription$ = executeAst(ast, {}).pipe(
        tap(console.log)
      )

      const subscription = subscription$.subscribe({
        next: (node: INode) => {
          // 发送节点执行事件
          res.write(`data: ${JSON.stringify(node)}\n\n`);
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
    @Body() body: { workflowId: number; inputs?: Record<string, unknown> },
  ): Promise<{ runId: number; run: WorkflowRunEntity }> {
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
  async executeRun(@Body() body: { runId: number }): Promise<WorkflowRunEntity> {
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
      const result = await executeAst(ast, run.inputs).toPromise();

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
  async getRun(@Body() body: { runId: number }): Promise<WorkflowRunEntity> {
    const { runId } = body;

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
      workflowId: number;
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
  async cancelRun(@Body() body: { runId: number }): Promise<{ success: boolean }> {
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
   * 提取节点输出
   *
   * 优雅设计：
   * - 提取所有非系统属性作为输出
   * - 过滤掉内部状态字段
   */
  private extractNodeOutputs(node: any): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};
    const systemKeys = ['id', 'type', 'state', 'error', 'position', 'name'];

    Object.keys(node).forEach((key) => {
      if (!systemKeys.includes(key) && node[key] !== undefined) {
        outputs[key] = node[key];
      }
    });

    return outputs;
  }

  /**
   * 提取工作流输出
   *
   * 优雅设计：
   * - 收集所有成功节点的输出
   * - 以节点 ID 为 key 组织输出
   */
  private extractWorkflowOutputs(ast: any): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};

    if (ast.nodes) {
      ast.nodes.forEach((node: any) => {
        if (node.state === 'success') {
          outputs[node.id] = this.extractNodeOutputs(node);
        }
      });
    }

    return outputs;
  }
}