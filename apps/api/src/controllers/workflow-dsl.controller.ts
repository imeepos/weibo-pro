import { Controller, Post, Body, Get, Query, BadRequestException } from '@sker/core';
import { WorkflowDSLService } from '../services/workflow-dsl.service';
import { logger } from '@sker/core';
import * as sdk from '@sker/sdk';
import type {
  GenerateDSLPayload,
  GenerateDSLResult,
  RefineDSLPayload,
  CompileDSLPayload,
  CompileDSLResult,
  NodeTypeInfo,
  NodeSchemaInfo
} from '@sker/sdk';

/**
 * 工作流 DSL 生成控制器
 *
 * 职责：
 * - 提供 AI 生成工作流 DSL 的 API 端点
 * - 支持交互式优化和迭代
 * - 管理生成会话状态
 */
@Controller(sdk.WorkflowDSLController)
export class WorkflowDSLController implements sdk.WorkflowDSLController {
  private readonly workflowDSLService: WorkflowDSLService;

  constructor() {
    this.workflowDSLService = new WorkflowDSLService();
  }

  @Post('/generate')
  async generate(@Body() body: GenerateDSLPayload): Promise<GenerateDSLResult> {
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

  @Post('/refine')
  async refine(@Body() body: RefineDSLPayload): Promise<GenerateDSLResult> {
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

  @Post('/compile')
  async compile(@Body() body: CompileDSLPayload): Promise<CompileDSLResult> {
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

  @Get('/nodes')
  async listNodes(@Query() query: { category?: 'data-sources' | 'ai-capabilities' | 'data-processing' | 'all' }): Promise<NodeTypeInfo[]> {
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

  @Get('/node-schema')
  async getNodeSchema(@Query() query: { nodeType: string }): Promise<NodeSchemaInfo> {
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
