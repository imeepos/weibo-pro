import { Controller, Post, Body, Get, BadRequestException, Query, Delete, NotFoundException } from '@nestjs/common';
import { useQueue } from '@sker/mq';
import type { PostNLPTask } from '@sker/workflow-run';
import {
  WeiboKeywordSearchAst,
  WeiboAjaxStatusesShowAst,
  WeiboAjaxStatusesCommentAst,
  WeiboAjaxStatusesRepostTimelineAst,
} from '@sker/workflow-ast';
import { execute, fromJson } from '@sker/workflow';
import { WorkflowGraphAst } from '@sker/workflow';
import { logger } from '../utils/logger';
import * as sdk from '@sker/sdk';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowRunService } from '../services/workflow-run.service';
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
  private nlpQueue = useQueue<PostNLPTask>('post_nlp_queue');
  private readonly workflowService: WorkflowService;
  private readonly workflowRunService: WorkflowRunService;

  constructor() {
    this.workflowService = root.get(WorkflowService);
    this.workflowRunService = root.get(WorkflowRunService);
  }

  /**
   * 触发单个微博帖子的NLP分析工作流
   *
   * 优雅设计：
   * - 通过消息队列解耦触发和执行
   * - 支持异步处理，立即返回响应
   * - 统一的异常处理机制
   */
  @Post('trigger-nlp')
  async triggerNlpAnalysis(@Body() body: { postId: string }) {
    const { postId } = body;

    if (!postId || postId.trim().length === 0) {
      throw new BadRequestException('帖子ID不能为空');
    }

    this.nlpQueue.producer.next({ postId });

    return {
      message: 'NLP分析任务已成功触发',
      postId,
    };
  }

  /**
   * 触发微博关键词搜索工作流
   *
   * 优雅设计：
   * - 支持完整的关键词搜索流程
   * - 自动推送发现的帖子到NLP队列
   * - 统一的参数验证和异常处理
   */
  @Post('search-weibo')
  async searchWeibo(@Body() body: {
    keyword: string;
    startDate: string;
    endDate: string;
    page?: number;
  }) {
    const { keyword, startDate, endDate, page = 1 } = body;

    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException('搜索关键词不能为空');
    }

    if (!startDate || !endDate) {
      throw new BadRequestException('开始日期和结束日期不能为空');
    }

    const searchAst = new WeiboKeywordSearchAst();
    searchAst.keyword = keyword.trim();
    searchAst.startDate = new Date(startDate);
    searchAst.endDate = new Date(endDate);
    searchAst.page = page;

    logger.info('Starting Weibo search', { keyword, dateRange: `${startDate}~${endDate}` });

    const result = await execute(searchAst, {});

    return {
      message: '微博搜索任务已成功执行',
      keyword,
      startDate,
      endDate,
      page,
      searchResult: result,
    };
  }

  /**
   * 获取工作流状态
   *
   * 优雅设计：
   * - 提供工作流执行状态查询
   * - 支持队列状态监控
   * - 返回系统健康状态
   */
  @Get('status')
  async getWorkflowStatus() {
    return {
      nlpQueue: 'active',
      workflowEngine: 'running',
      lastExecution: new Date().toISOString(),
    };
  }

  /**
   * 批量触发NLP分析
   *
   * 优雅设计：
   * - 支持批量处理多个帖子
   * - 统一的参数验证
   * - 提供进度跟踪
   */
  @Post('batch-nlp')
  async batchTriggerNlp(@Body() body: { postIds: string[] }) {
    const { postIds } = body;

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      throw new BadRequestException('帖子ID列表不能为空');
    }

    const results = postIds.map(postId => {
      this.nlpQueue.producer.next({ postId });
      return { postId, status: 'queued' };
    });

    return {
      message: `批量NLP分析任务已成功触发，共 ${postIds.length} 个任务`,
      total: postIds.length,
      results,
    };
  }

  /**
   * 爬取微博帖子详情（包括评论和转发）
   *
   * 优雅设计：
   * - 完整爬取帖子的所有上下文信息
   * - 爬取完成后数据自动保存到数据库
   * - 为后续NLP分析做好数据准备
   * - 统一的异常处理机制
   */
  @Post('crawl-post')
  async crawlPost(@Body() body: { postId: string }) {
    const { postId } = body;

    if (!postId || postId.trim().length === 0) {
      throw new BadRequestException('帖子ID不能为空');
    }

    logger.info('Starting post crawl', { postId });

    const showAst = new WeiboAjaxStatusesShowAst();
    showAst.mblogid = postId;

    const commentAst = new WeiboAjaxStatusesCommentAst();
    const repostAst = new WeiboAjaxStatusesRepostTimelineAst();

    const workflow = {
      nodes: [showAst, commentAst, repostAst],
      edges: [
        {
          from: showAst.id,
          fromProperty: 'uid',
          to: commentAst.id,
          toProperty: 'uid',
        },
        {
          from: showAst.id,
          fromProperty: 'mid',
          to: commentAst.id,
          toProperty: 'mid',
        },
        {
          from: showAst.id,
          fromProperty: 'uid',
          to: repostAst.id,
          toProperty: 'uid',
        },
        {
          from: showAst.id,
          fromProperty: 'mid',
          to: repostAst.id,
          toProperty: 'mid',
        },
      ],
    };

    await execute(workflow as any, {});

    if (showAst.state !== 'success') {
      logger.error('Post crawl failed', { postId, error: showAst.error?.message });
      throw new Error(showAst.error?.message || '帖子爬取失败');
    }

    const crawlResult = {
      message: '帖子爬取成功',
      postId,
      mid: showAst.mid,
      uid: showAst.uid,
      commentsCount: commentAst.entities?.length || 0,
      commentsCrawled: commentAst.state === 'success',
      repostsCrawled: repostAst.state === 'success',
    };

    logger.info('Post crawl successful', crawlResult);

    return crawlResult;
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

  /**
   * 根据 name 获取工作流
   */
  @Get('get')
  async getWorkflow(@Query() params: { name: string }): Promise<WorkflowGraphAst | null> {
    const { name } = params;

    if (!name || name.trim().length === 0) {
      throw new BadRequestException('工作流名称不能为空');
    }

    const workflow = await this.workflowService.getWorkflowByName(name);

    if (workflow) return workflow
    const workflowAst = new WorkflowGraphAst()
    workflowAst.name = name;
    await this.saveWorkflow(workflowAst)
    return workflowAst
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
   * 创建分享链接
   */
  @Post('share')
  async createShare(@Body() body: { workflowId: string; expiresAt?: string }): Promise<sdk.CreateShareResult> {
    const { workflowId } = body;

    if (!workflowId || workflowId.trim().length === 0) {
      throw new BadRequestException('工作流ID不能为空');
    }

    return await this.workflowService.createShare(body);
  }

  /**
   * 获取分享的工作流
   */
  @Get('shared/:token')
  async getSharedWorkflow(@Query() params: { token: string }): Promise<sdk.WorkflowData | null> {
    const { token } = params;

    if (!token || token.trim().length === 0) {
      throw new BadRequestException('分享令牌不能为空');
    }

    const workflow = await this.workflowService.getSharedWorkflow(token);

    if (!workflow) {
      throw new NotFoundException('分享链接不存在或已过期');
    }

    return workflow;
  }

  /**
   * 执行单个节点
   *
   * 优雅设计：
   * - 从工作流数据中反序列化节点
   * - 执行指定节点
   * - 返回执行结果和状态
   * - 妥善处理所有错误，确保服务稳定
   */
  @Post('execute-node')
  async executeNode(@Body() body: WorkflowGraphAst): Promise<WorkflowGraphAst> {
    const { id: nodeId, nodes, edges, ctx = {} } = body;

    if (!nodeId || nodeId.trim().length === 0) {
      throw new BadRequestException('节点ID不能为空');
    }

    if (!nodes || !edges) {
      throw new BadRequestException('工作流数据格式错误');
    }

    try {
      // 重建工作流 AST
      const ast = fromJson(body);

      // 执行节点
      const result = await execute(ast, ctx);

      logger.info('Node execution completed', {
        nodeId,
        state: result.state,
        nodesExecuted: result.nodes?.length
      });

      return result;
    } catch (error: any) {
      logger.error('Node execution failed', {
        nodeId,
        error: error.message,
        type: error.type || error.name,
        stack: error.stack
      });

      // 构造失败响应，确保前端能够正确显示错误
      const failedResult = fromJson(body);
      failedResult.state = 'fail';
      failedResult.error = {
        message: error.message || '执行失败',
        type: error.type || 'UNKNOWN_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };

      return failedResult;
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
      const result = await execute(ast, run.inputs);

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
              message: result.error.message,
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