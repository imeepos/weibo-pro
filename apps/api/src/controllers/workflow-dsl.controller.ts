import { Controller, Post, Body, Get, Query, BadRequestException } from '@sker/core';
import { WorkflowDSLService } from '../services/workflow-dsl.service';
import { logger } from '@sker/core';

/**
 * 工作流 DSL 生成控制器
 *
 * 职责：
 * - 提供 AI 生成工作流 DSL 的 API 端点
 * - 支持交互式优化和迭代
 * - 管理生成会话状态
 */
@Controller('/workflow-dsl')
export class WorkflowDSLController {
  private readonly workflowDSLService: WorkflowDSLService;

  constructor() {
    this.workflowDSLService = new WorkflowDSLService();
  }

  /**
   * 从自然语言生成工作流 DSL
   *
   * @param body - 包含任务描述和可选会话 ID
   * @returns 生成的 DSL 代码、说明和编译状态
   */
  @Post('/generate')
  async generate(
    @Body() body: { description: string; sessionId?: string }
  ): Promise<{
    sessionId: string;
    dslCode: string;
    explanation: string;
    nodeCount: number;
    complexity: string;
    compilationStatus: 'success' | 'error';
    errors?: string[];
  }> {
    const { description, sessionId } = body;

    if (!description || description.trim().length === 0) {
      throw new BadRequestException('任务描述不能为空');
    }

    logger.info('开始生成工作流 DSL', { description, sessionId });

    try {
      const result = await this.workflowDSLService.generate(description, sessionId);

      logger.info('工作流 DSL 生成成功', {
        sessionId: result.sessionId,
        nodeCount: result.nodeCount,
        complexity: result.complexity,
      });

      return result;
    } catch (error) {
      logger.error('工作流 DSL 生成失败', {
        description,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 基于用户反馈优化 DSL
   *
   * @param body - 包含会话 ID 和用户反馈
   * @returns 优化后的 DSL 代码和编译状态
   */
  @Post('/refine')
  async refine(
    @Body() body: { sessionId: string; feedback: string }
  ): Promise<{
    sessionId: string;
    dslCode: string;
    explanation: string;
    nodeCount: number;
    complexity: string;
    compilationStatus: 'success' | 'error';
    errors?: string[];
  }> {
    const { sessionId, feedback } = body;

    if (!sessionId || sessionId.trim().length === 0) {
      throw new BadRequestException('会话 ID 不能为空');
    }

    if (!feedback || feedback.trim().length === 0) {
      throw new BadRequestException('反馈内容不能为空');
    }

    logger.info('开始优化工作流 DSL', { sessionId, feedback });

    try {
      const result = await this.workflowDSLService.refine(sessionId, feedback);

      logger.info('工作流 DSL 优化成功', {
        sessionId: result.sessionId,
        nodeCount: result.nodeCount,
      });

      return result;
    } catch (error) {
      logger.error('工作流 DSL 优化失败', {
        sessionId,
        feedback,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 编译 DSL 代码
   *
   * @param body - 包含 DSL 代码
   * @returns 编译结果
   */
  @Post('/compile')
  async compile(
    @Body() body: { dslCode: string }
  ): Promise<{
    success: boolean;
    workflowGraph?: any;
    errors?: Array<{ message: string; line?: number; column?: number; phase?: string }>;
  }> {
    const { dslCode } = body;

    if (!dslCode || dslCode.trim().length === 0) {
      throw new BadRequestException('DSL 代码不能为空');
    }

    logger.info('开始编译 DSL 代码');

    try {
      const result = await this.workflowDSLService.compile(dslCode);

      logger.info('DSL 编译完成', { success: result.success });

      return result;
    } catch (error) {
      logger.error('DSL 编译失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 列出所有可用的节点类型
   *
   * @param query - 可选的类别筛选
   * @returns 节点类型列表
   */
  @Get('/nodes')
  async listNodes(
    @Query() query: { category?: 'data-sources' | 'ai-capabilities' | 'data-processing' | 'all' }
  ): Promise<Array<{ name: string; title: string; type: string; description: string }>> {
    const { category = 'all' } = query;

    logger.info('列出可用节点类型', { category });

    try {
      const nodes = await this.workflowDSLService.listAvailableNodes(category);

      logger.info('节点类型列表获取成功', { count: nodes.length });

      return nodes;
    } catch (error) {
      logger.error('获取节点类型列表失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 获取指定节点的 Schema
   *
   * @param query - 节点类型名称
   * @returns 节点的输入输出 Schema
   */
  @Get('/node-schema')
  async getNodeSchema(
    @Query() query: { nodeType: string }
  ): Promise<{
    name: string;
    title: string;
    description: string;
    inputs: Array<{ name: string; type: string; required: boolean; description: string }>;
    outputs: Array<{ name: string; type: string; description: string }>;
  }> {
    const { nodeType } = query;

    if (!nodeType || nodeType.trim().length === 0) {
      throw new BadRequestException('节点类型不能为空');
    }

    logger.info('获取节点 Schema', { nodeType });

    try {
      const schema = await this.workflowDSLService.getNodeSchema(nodeType);

      logger.info('节点 Schema 获取成功', { nodeType });

      return schema;
    } catch (error) {
      logger.error('获取节点 Schema 失败', {
        nodeType,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}
