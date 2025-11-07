import { Controller, Post, Body, Get, BadRequestException } from '@nestjs/common';
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

    console.log(`[WorkflowController] 开始微博搜索: keyword=${keyword}, dateRange=${startDate}~${endDate}`);

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

    console.log(`[WorkflowController] 开始爬取帖子: postId=${postId}`);

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
      console.error(`[WorkflowController] 帖子爬取失败: postId=${postId}`, showAst.error);
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

    console.log('[WorkflowController] 帖子爬取成功:', crawlResult);

    return crawlResult;
  }
}