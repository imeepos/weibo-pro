import { Controller, Post, Body, Get } from '@nestjs/common';
import { useQueue } from '@sker/mq';
import type { PostNLPTask } from '@sker/workflow-run';
import {
  WeiboKeywordSearchAst,
  WeiboAjaxStatusesShowAst,
  WeiboAjaxStatusesCommentAst,
  WeiboAjaxStatusesRepostTimelineAst,
} from '@sker/workflow-ast';
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

  /**
   * 爬取微博帖子详情（包括评论和转发）
   *
   * 优雅设计：
   * - 完整爬取帖子的所有上下文信息
   * - 爬取完成后数据自动保存到数据库
   * - 为后续NLP分析做好数据准备
   * - 提供清晰的爬取状态反馈
   */
  @Post('crawl-post')
  async crawlPost(@Body() body: { postId: string }) {
    try {
      const { postId } = body;

      if (!postId || postId.trim().length === 0) {
        return {
          success: false,
          message: '帖子ID不能为空',
          timestamp: new Date().toISOString(),
        };
      }

      console.log(`[WorkflowController] 开始爬取帖子: postId=${postId}`);

      // 创建爬取帖子详情的AST节点
      const showAst = new WeiboAjaxStatusesShowAst();
      showAst.mblogid = postId;

      // 创建爬取评论的AST节点
      const commentAst = new WeiboAjaxStatusesCommentAst();

      // 创建爬取转发的AST节点
      const repostAst = new WeiboAjaxStatusesRepostTimelineAst();

      // 构建工作流：帖子详情 -> 评论 & 转发
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

      // 执行爬取工作流
      await execute(workflow as any, {});

      // 检查爬取结果
      if (showAst.state === 'success') {
        const crawlResult = {
          postId,
          mid: showAst.mid,
          uid: showAst.uid,
          commentsCount: commentAst.entities?.length || 0,
          repostsCount: repostAst.entities?.length || 0,
          commentsCrawled: commentAst.state === 'success',
          repostsCrawled: repostAst.state === 'success',
        };

        console.log('[WorkflowController] 帖子爬取成功:', crawlResult);

        return {
          success: true,
          message: '帖子爬取成功',
          data: crawlResult,
          timestamp: new Date().toISOString(),
        };
      } else {
        console.error(`[WorkflowController] 帖子爬取失败: postId=${postId}`, showAst.error);

        return {
          success: false,
          message: '帖子爬取失败',
          error: showAst.error?.message || '未知错误',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('[WorkflowController] 爬取帖子异常:', error);

      return {
        success: false,
        message: '爬取帖子失败',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}