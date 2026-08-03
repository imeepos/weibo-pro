/**
 * 爬虫任务控制面板
 * 提供手动触发爬虫任务和实时监控功能
 */

import React, { useState, useEffect } from 'react';
import { CrawlerAPI, type CrawlerControlStatusSummary } from '@/services/api/crawler';
import { createLogger } from '@/utils';
import { NLP_UNSUPPORTED_MESSAGE } from './CrawlerControl.panels';
import { CrawlAndAnalyzePanel, BatchNlpPanel, SearchPanel } from './CrawlerControl.panels';
import { WorkflowStatusCard, ExecutionRecordsCard } from './CrawlerControl.monitor';
import type { TaskExecution, TaskType } from './CrawlerControl.types';

const logger = createLogger('CrawlerControl');

const CrawlerControl: React.FC = () => {
  // ========== 状态管理 ==========
  const [workflowStatus, setWorkflowStatus] = useState<CrawlerControlStatusSummary | null>(null);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [_loading, _setLoading] = useState(false);

  // NLP 单任务表单
  const [nlpPostId, setNlpPostId] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);

  // NLP 批量任务表单
  const [batchPostIds, setBatchPostIds] = useState('');
  const [batchLoading, _setBatchLoading] = useState(false);

  // 微博搜索表单
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [searchPage, setSearchPage] = useState('1');
  const [searchLoading, setSearchLoading] = useState(false);

  // ========== 生命周期 ==========
  useEffect(() => {
    loadWorkflowStatus();
    const interval = setInterval(loadWorkflowStatus, 10000); // 每10秒刷新
    return () => clearInterval(interval);
  }, []);

  // ========== API 调用 ==========
  const loadWorkflowStatus = async () => {
    try {
      const status = await CrawlerAPI.getStatusSummary();
      setWorkflowStatus(status);
    } catch (error) {
      logger.error('Failed to load workflow status', error);
    }
  };

  const addExecution = (type: TaskType, params: any, status: 'pending' | 'success' | 'error', message?: string) => {
    const execution: TaskExecution = {
      id: Date.now().toString(),
      type,
      status,
      timestamp: new Date().toISOString(),
      params,
      message,
    };
    setExecutions((prev) => [execution, ...prev].slice(0, 10)); // 保留最近10条
  };

  // ========== 任务触发函数 ==========
  const handleCrawlPost = async () => {
    if (!nlpPostId.trim()) {
      alert('请输入帖子 ID');
      return;
    }

    setNlpLoading(true);
    addExecution('crawl', { postId: nlpPostId }, 'pending');

    try {
      const response = await CrawlerAPI.crawlPost({ postId: nlpPostId.trim() });
      addExecution('crawl', { postId: nlpPostId }, 'success', response?.message || '详情爬取任务已启动');
      logger.info('Post crawled', response);
    } catch (error: any) {
      addExecution('crawl', { postId: nlpPostId }, 'error', error?.message || '爬取失败');
      logger.error('Failed to crawl post', error);
    } finally {
      setNlpLoading(false);
    }
  };

  const handleTriggerNLP = async () => {
    addExecution('nlp', { postId: nlpPostId }, 'error', NLP_UNSUPPORTED_MESSAGE);
  };

  const handleCrawlAndAnalyze = async () => {
    addExecution('crawl-and-analyze', { postId: nlpPostId }, 'error', NLP_UNSUPPORTED_MESSAGE);
  };

  const handleBatchNLP = async () => {
    addExecution('batch-nlp', { raw: batchPostIds }, 'error', NLP_UNSUPPORTED_MESSAGE);
  };

  const handleSearchWeibo = async () => {
    if (!searchKeyword.trim()) {
      alert('请填写关键词');
      return;
    }

    const params = {
      keyword: searchKeyword.trim(),
      startDate: searchStartDate,
      endDate: searchEndDate,
      page: parseInt(searchPage, 10) || 1,
    };

    setSearchLoading(true);
    addExecution('search', params, 'pending');

    try {
      const response = await CrawlerAPI.searchWeibo(params);
      addExecution('search', params, 'success', response?.message || '关键词搜索任务已启动');
      logger.info('Weibo search completed', response);
    } catch (error: any) {
      addExecution('search', params, 'error', error?.message || '搜索失败');
      logger.error('Failed to search Weibo', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // ========== 渲染 ==========
  return (
    <div className="dashboard-no-scroll relative h-full">
      <div className="absolute top-0 left-0 right-0 bottom-0 dashboard-main-content">
        {/* 左侧：工作流状态和执行记录 */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-hidden">
          {/* 工作流状态卡片 */}
          <WorkflowStatusCard workflowStatus={workflowStatus} />

          {/* 执行记录卡片 */}
          <ExecutionRecordsCard executions={executions} />
        </div>

        {/* 右侧：任务触发面板 */}
        <div className="col-span-12 lg:col-span-8 h-full min-h-0 relative overflow-hidden">
          <div className="absolute left-0 right-0 top-0 bottom-0 overflow-y-auto overflow-x-hidden crawler-control-scroll-wrapper">
            <div className="flex flex-col gap-4 py-1">
              {/* 单任务爬取与分析 */}
              <CrawlAndAnalyzePanel
                nlpPostId={nlpPostId}
                onNlpPostIdChange={setNlpPostId}
                nlpLoading={nlpLoading}
                onCrawlPost={handleCrawlPost}
                onTriggerNLP={handleTriggerNLP}
                onCrawlAndAnalyze={handleCrawlAndAnalyze}
              />

              {/* NLP 批量任务触发 */}
              <BatchNlpPanel
                batchPostIds={batchPostIds}
                onBatchPostIdsChange={setBatchPostIds}
                batchLoading={batchLoading}
                onBatchNLP={handleBatchNLP}
              />

              {/* 微博搜索触发 */}
              <SearchPanel
                searchKeyword={searchKeyword}
                onSearchKeywordChange={setSearchKeyword}
                searchStartDate={searchStartDate}
                onSearchStartDateChange={setSearchStartDate}
                searchEndDate={searchEndDate}
                onSearchEndDateChange={setSearchEndDate}
                searchPage={searchPage}
                onSearchPageChange={setSearchPage}
                searchLoading={searchLoading}
                onSearch={handleSearchWeibo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrawlerControl;
