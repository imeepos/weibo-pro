/**
 * 工作流 API 服务
 * 提供爬虫任务触发和状态查询功能
 */

import { apiUtils } from './client';
import { createLogger } from '@/utils';

const logger = createLogger('WorkflowAPI');

// ================ 类型定义 ================

/** 触发 NLP 分析请求 */
export interface TriggerNLPRequest {
  postId: string;
}

/** 爬取帖子请求 */
export interface CrawlPostRequest {
  postId: string;
}

/** 爬取帖子响应数据 */
export interface CrawlPostData {
  postId: string;
  mid: string;
  uid: string;
  commentsCount: number;
  repostsCount: number;
  commentsCrawled: boolean;
  repostsCrawled: boolean;
}

/** 批量触发 NLP 分析请求 */
export interface BatchNLPRequest {
  postIds: string[];
}

/** 微博关键词搜索请求 */
export interface WeiboSearchRequest {
  keyword: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  page?: number;
}

/** 工作流状态响应 */
export interface WorkflowStatusResponse {
  nlpQueue: 'active' | 'inactive' | 'error';
  workflowEngine: 'running' | 'stopped' | 'error';
  lastExecution?: string; // ISO 8601 时间戳
  queueDepth?: number;
}

/** API 响应包装 */
export interface WorkflowApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

// ================ API 服务类 ================

export class WorkflowAPI {
  private static readonly BASE_PATH = '/api/workflow';

  /**
   * 爬取单个帖子的详情（包括评论和转发）
   * @param request 包含 postId 的请求对象
   */
  static async crawlPost(request: CrawlPostRequest): Promise<WorkflowApiResponse<CrawlPostData>> {
    logger.info('Crawling post details', request);

    try {
      const response = await apiUtils.post<WorkflowApiResponse<CrawlPostData>>(
        `${this.BASE_PATH}/crawl-post`,
        request
      );

      logger.info('Post crawled successfully', response.data);
      return response.data;
    } catch (error) {
      logger.error('Failed to crawl post', error);
      throw error;
    }
  }

  /**
   * 触发单个帖子的 NLP 分析
   * @param request 包含 postId 的请求对象
   */
  static async triggerNLP(request: TriggerNLPRequest): Promise<WorkflowApiResponse> {
    logger.info('Triggering NLP analysis', request);

    try {
      const response = await apiUtils.post<WorkflowApiResponse>(
        `${this.BASE_PATH}/trigger-nlp`,
        request
      );

      logger.info('NLP analysis triggered successfully', response.data);
      return response.data;
    } catch (error) {
      logger.error('Failed to trigger NLP analysis', error);
      throw error;
    }
  }

  /**
   * 批量触发 NLP 分析
   * @param request 包含 postIds 数组的请求对象
   */
  static async batchNLP(request: BatchNLPRequest): Promise<WorkflowApiResponse> {
    logger.info('Triggering batch NLP analysis', {
      postCount: request.postIds.length,
    });

    try {
      const response = await apiUtils.post<WorkflowApiResponse>(
        `${this.BASE_PATH}/batch-nlp`,
        request
      );

      logger.info('Batch NLP analysis triggered successfully', response.data);
      return response.data;
    } catch (error) {
      logger.error('Failed to trigger batch NLP analysis', error);
      throw error;
    }
  }

  /**
   * 执行微博关键词搜索
   * @param request 搜索参数
   */
  static async searchWeibo(request: WeiboSearchRequest): Promise<WorkflowApiResponse> {
    logger.info('Searching Weibo', request);

    try {
      const response = await apiUtils.post<WorkflowApiResponse>(
        `${this.BASE_PATH}/search-weibo`,
        request
      );

      logger.info('Weibo search completed', response.data);
      return response.data;
    } catch (error) {
      logger.error('Failed to search Weibo', error);
      throw error;
    }
  }

  /**
   * 获取工作流状态
   */
  static async getStatus(): Promise<WorkflowStatusResponse> {
    logger.info('Fetching workflow status');

    try {
      const response = await apiUtils.get<WorkflowApiResponse<WorkflowStatusResponse>>(
        `${this.BASE_PATH}/status`
      );

      const statusData = response?.data?.data || {
        nlpQueue: 'inactive' as const,
        workflowEngine: 'stopped' as const,
      };

      logger.info('Workflow status fetched', statusData);
      return statusData;
    } catch (error) {
      logger.error('Failed to fetch workflow status', error);
      throw error;
    }
  }
}

// 默认导出
export default WorkflowAPI;
