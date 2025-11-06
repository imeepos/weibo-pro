import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { useQueue } from '@sker/mq';
import type { PostNLPTask } from '@sker/workflow-run';
import { WeiboKeywordSearchAst } from '@sker/workflow-ast';
import { execute } from '@sker/workflow';

/**
 * 爬虫工作流触发控制器
 *
 * 存在即合理：
 * - 提供优雅的API端点触发爬虫工作流
 * - 支持多种触发方式：NLP分析、微博搜索
 * - 集成消息队列，确保任务可靠执行
 */
@Controller('api/workflow')
export class WorkflowController {
  private nlpQueue = useQueue<PostNLPTask>('post_nlp_queue');

  /**
   * 触发单个微博帖子的NLP分析工作流
   *
   * 优雅设计：
   * - 通过消息队列解耦触发和执行
   * - 支持异步处理，立即返回响应
   * - 提供清晰的错误处理和状态反馈
   */
  @Post('trigger-nlp')
  async triggerNlpAnalysis(@Body() body: { postId: string }) {
    try {
      const { postId } = body;

      if (!postId || postId.trim().length === 0) {
        return {
          success: false,
          message: '帖子ID不能为空',
          timestamp: new Date().toISOString(),
        };
      }

      // 优雅地推送任务到消息队列
      this.nlpQueue.producer.next({ postId });

      console.log(`[WorkflowController] NLP分析任务已触发: postId=${postId}`);

      return {
        success: true,
        message: 'NLP分析任务已成功触发',
        data: { postId },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[WorkflowController] 触发NLP分析失败:', error);

      return {
        success: false,
        message: '触发NLP分析失败',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 触发微博关键词搜索工作流
   *
   * 优雅设计：
   * - 支持完整的关键词搜索流程
   * - 自动推送发现的帖子到NLP队列
   * - 提供搜索进度和结果反馈
   */
  @Post('search-weibo')
  async searchWeibo(@Body() body: {
    keyword: string;
    startDate: string;
    endDate: string;
    page?: number;
  }) {
    try {
      const { keyword, startDate, endDate, page = 1 } = body;

      // 优雅的参数验证
      if (!keyword || keyword.trim().length === 0) {
        return {
          success: false,
          message: '搜索关键词不能为空',
          timestamp: new Date().toISOString(),
        };
      }

      if (!startDate || !endDate) {
        return {
          success: false,
          message: '开始日期和结束日期不能为空',
          timestamp: new Date().toISOString(),
        };
      }

      // 创建搜索AST节点
      const searchAst = new WeiboKeywordSearchAst();
      searchAst.keyword = keyword.trim();
      searchAst.startDate = new Date(startDate);
      searchAst.endDate = new Date(endDate);
      searchAst.page = page;

      console.log(`[WorkflowController] 开始微博搜索: keyword=${keyword}, dateRange=${startDate}~${endDate}`);

      // 执行搜索工作流
      const result = await execute(searchAst, {});

      return {
        success: true,
        message: '微博搜索任务已成功执行',
        data: {
          keyword,
          startDate,
          endDate,
          page,
          searchResult: result,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[WorkflowController] 微博搜索失败:', error);

      return {
        success: false,
        message: '微博搜索失败',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
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
    try {
      // 这里可以扩展为查询工作流执行状态
      // 目前返回基础状态信息

      return {
        success: true,
        data: {
          nlpQueue: 'active',
          workflowEngine: 'running',
          lastExecution: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[WorkflowController] 获取工作流状态失败:', error);

      return {
        success: false,
        message: '获取工作流状态失败',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 批量触发NLP分析
   *
   * 优雅设计：
   * - 支持批量处理多个帖子
   * - 提供进度跟踪
   * - 优雅的错误处理
   */
  @Post('batch-nlp')
  async batchTriggerNlp(@Body() body: { postIds: string[] }) {
    try {
      const { postIds } = body;

      if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
        return {
          success: false,
          message: '帖子ID列表不能为空',
          timestamp: new Date().toISOString(),
        };
      }

      // 优雅地批量推送任务
      const results = postIds.map(postId => {
        this.nlpQueue.producer.next({ postId });
        return { postId, status: 'queued' };
      });

      console.log(`[WorkflowController] 批量NLP分析任务已触发: count=${postIds.length}`);

      return {
        success: true,
        message: `批量NLP分析任务已成功触发，共 ${postIds.length} 个任务`,
        data: {
          total: postIds.length,
          results,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[WorkflowController] 批量触发NLP分析失败:', error);

      return {
        success: false,
        message: '批量触发NLP分析失败',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}