import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@sker/core';
import { Observable, Subscription } from 'rxjs';
import { logger } from '@sker/core';
import { executeAst, NodeEvent } from '@sker/workflow';
import { PromptOptimizerAst } from '@sker/workflow-ast';
import {
  PromptOptimizationTaskEntity,
  PromptVersionEntity,
  OptimizationTaskStatus,
  useEntityManager,
} from '@sker/entities';
import * as sdk from '@sker/sdk';
import type {
  CreateOptimizationTaskPayload,
  ListTasksResult,
  QuickOptimizePayload
} from '@sker/sdk';

/**
 * 提示词优化 API 控制器
 *
 * 存在即合理：
 * - 提供提示词自动优化的 HTTP 接口
 * - 管理优化任务的全生命周期
 * - 支持 SSE 实时推送优化进度
 *
 * ⚠️ 重要：使用 useEntityManager 确保连接正确释放
 */
@Controller(sdk.PromptOptimizerController)
export class PromptOptimizerController implements sdk.PromptOptimizerController {

  constructor() {
  }

  /**
   * 创建优化任务
   *
   * @param body 任务配置
   * @returns 创建的任务实体
   */
  @Post('/tasks')
  async createTask(@Body() body: CreateOptimizationTaskPayload): Promise<PromptOptimizationTaskEntity> {
    if (!body.name || body.name.trim().length === 0) {
      throw new BadRequestException('任务名称不能为空');
    }

    if (!body.targetOutput || body.targetOutput.trim().length === 0) {
      throw new BadRequestException('目标输出不能为空');
    }

    return await useEntityManager(async (manager) => {
      const task = new PromptOptimizationTaskEntity();
      task.name = body.name;
      task.targetOutput = body.targetOutput;
      task.targetContext = body.targetContext;
      task.evaluationCriteria = body.evaluationCriteria || {
        '语义相似度': 0.4,
        '格式匹配': 0.3,
        '关键词覆盖': 0.3,
      };
      task.optimizationConfig = {
        maxIterations: body.optimizationConfig?.maxIterations || 5,
        targetScore: body.optimizationConfig?.targetScore || 85,
        model: body.optimizationConfig?.model || 'deepseek-ai/DeepSeek-V3.2',
        temperature: body.optimizationConfig?.temperature || 0.7,
        testRuns: body.optimizationConfig?.testRuns || 3,
      };

      // 如果提供了初始提示词，创建第一个版本
      if (body.initialPrompt) {
        const savedTask = await manager.save(PromptOptimizationTaskEntity, task);

        const version = new PromptVersionEntity();
        version.taskId = savedTask.id;
        version.versionNumber = 0;
        version.prompt = body.initialPrompt;
        version.optimizationRationale = '用户提供的初始提示词';
        await manager.save(PromptVersionEntity, version);

        return savedTask;
      }

      return await manager.save(PromptOptimizationTaskEntity, task);
    });
  }

  /**
   * 获取任务详情
   */
  @Get('/tasks/:taskId')
  async getTask(@Param('taskId') taskId: string): Promise<PromptOptimizationTaskEntity> {
    return await useEntityManager(async (manager) => {
      const task = await manager.findOne(PromptOptimizationTaskEntity, {
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException(`任务不存在: ${taskId}`);
      }

      return task;
    });
  }

  /**
   * 列出所有任务
   */
  @Get('/tasks')
  async listTasks(
    @Query() query: { status?: OptimizationTaskStatus; page?: number; pageSize?: number }
  ): Promise<ListTasksResult> {
    return await useEntityManager(async (manager) => {
      const { status, page = 1, pageSize = 20 } = query;

      const queryBuilder = manager
        .createQueryBuilder(PromptOptimizationTaskEntity, 'task')
        .orderBy('task.createdAt', 'DESC');

      if (status) {
        queryBuilder.where('task.status = :status', { status });
      }

      const total = await queryBuilder.getCount();
      const tasks = await queryBuilder
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getMany();

      return { tasks, total };
    });
  }

  /**
   * 执行优化任务 - SSE 版本
   *
   * 优雅设计：
   * - 使用 SSE 实时推送优化进度
   * - 支持取消优化
   * - 自动保存优化结果
   */
  @Post({ path: '/tasks/:taskId/execute', sse: true })
  executeTask(@Param('taskId') taskId: string): Observable<NodeEvent> {
    return new Observable((observer) => {
      // 收集内层订阅，客户端断开（外层 unsubscribe）时拆除，避免僵尸工作流泄漏
      let inner: Subscription | null = null;
      let disposed = false;

      useEntityManager(async (manager) => {
        const task = await manager.findOne(PromptOptimizationTaskEntity, { where: { id: taskId } });

        if (!task) {
          const error = new NotFoundException(`任务不存在: ${taskId}`);
          observer.error(error);
          return;
        }

        // 更新任务状态
        task.status = OptimizationTaskStatus.RUNNING;
        task.startedAt = new Date();
        await manager.save(PromptOptimizationTaskEntity, task);

        // 构建 PromptOptimizerAst 节点
        const ast = new PromptOptimizerAst();
        ast.targetOutput = task.targetOutput;
        ast.targetContext = task.targetContext || '';
        ast.maxIterations = task.optimizationConfig.maxIterations;
        ast.targetScore = task.optimizationConfig.targetScore;
        ast.testRuns = task.optimizationConfig.testRuns;
        ast.generatorModel = task.optimizationConfig.model;
        ast.testerModel = task.optimizationConfig.model;
        ast.evaluatorModel = task.optimizationConfig.model;
        ast.generatorTemperature = task.optimizationConfig.temperature;

        // 转换评估标准为评估维度
        const dimensions = Object.entries(task.evaluationCriteria).map(
          ([name, weight]) => ({
            name,
            weight: weight as number,
            description: `${name}评估`,
          })
        );
        ast.evaluationDimensions = dimensions;

        // 检查是否有初始提示词
        const initialVersion = await manager.findOne(PromptVersionEntity, {
          where: { taskId: task.id, versionNumber: 0 },
        });
        if (initialVersion) {
          ast.initialPrompt = initialVersion.prompt;
        }

        // 客户端已断开：不再启动工作流（避免"先启动再取消"窗口产生僵尸执行）
        if (disposed) {
          return;
        }

        // 执行优化
        const sub = executeAst(ast, {}).subscribe(observer);
        if (disposed) {
          sub.unsubscribe();
        } else {
          inner = sub;
        }
      })
      .catch((error) => {
        logger.error('获取任务失败', { taskId, error: error.message });
        observer.error(error);
      });

      // 客户端断开时拆除内层订阅，终止僵尸工作流执行
      return () => {
        disposed = true;
        inner?.unsubscribe();
      };
    });
  }

  /**
   * 获取任务的所有版本
   */
  @Get('/tasks/:taskId/versions')
  async getVersions(
    @Param('taskId') taskId: string
  ): Promise<PromptVersionEntity[]> {
    return await useEntityManager(async (manager) => {
      return await manager.find(PromptVersionEntity, {
        where: { taskId },
        order: { versionNumber: 'ASC' },
      });
    });
  }

  /**
   * 获取特定版本详情
   */
  @Get('/tasks/:taskId/versions/:versionId')
  async getVersion(
    @Param('taskId') taskId: string,
    @Param('versionId') versionId: string
  ): Promise<PromptVersionEntity> {
    return await useEntityManager(async (manager) => {
      const version = await manager.findOne(PromptVersionEntity, {
        where: { id: versionId, taskId },
      });

      if (!version) {
        throw new NotFoundException(`版本不存在: ${versionId}`);
      }

      return version;
    });
  }

  /**
   * 获取最佳版本
   */
  @Get('/tasks/:taskId/best')
  async getBestVersion(@Param('taskId') taskId: string): Promise<PromptVersionEntity | null> {
    return await useEntityManager(async (manager) => {
      return await manager.findOne(PromptVersionEntity, {
        where: { taskId, isBest: true },
      });
    });
  }

  /**
   * 快速优化 - 一键优化提示词
   *
   * 简化版 API，适合快速使用
   */
  @Post({ path: '/quick', sse: true })
  quickOptimize(@Body() body: QuickOptimizePayload): Observable<NodeEvent> {

    if (!body.targetOutput || body.targetOutput.trim().length === 0) {
      throw new BadRequestException('目标输出不能为空');
    }

    // 构建 PromptOptimizerAst 节点
    const ast = new PromptOptimizerAst();
    ast.targetOutput = body.targetOutput;
    ast.targetContext = body.targetContext || '';
    ast.initialPrompt = body.initialPrompt || '';
    ast.maxIterations = body.maxIterations || 3;
    ast.targetScore = body.targetScore || 80;

    // 执行优化
    const events$ = executeAst(ast, {});
    return events$;
  }
}
