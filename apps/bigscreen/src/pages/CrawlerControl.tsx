/**
 * 爬虫任务控制面板
 * 提供手动触发爬虫任务和实时监控功能
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WorkflowAPI, WorkflowStatusResponse } from '@/services/api/workflow';
import { createLogger } from '@/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const logger = createLogger('CrawlerControl');

// 任务类型枚举
type TaskType = 'crawl' | 'nlp' | 'crawl-and-analyze' | 'batch-nlp' | 'search';

// 任务执行记录
interface TaskExecution {
  id: string;
  type: TaskType;
  status: 'pending' | 'success' | 'error';
  timestamp: string;
  params: any;
  message?: string;
}

const CrawlerControl: React.FC = () => {
  // ========== 状态管理 ==========
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusResponse | null>(null);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [loading, setLoading] = useState(false);

  // NLP 单任务表单
  const [nlpPostId, setNlpPostId] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);

  // NLP 批量任务表单
  const [batchPostIds, setBatchPostIds] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

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
      const status = await WorkflowAPI.getStatus();
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
      const response = await WorkflowAPI.crawlPost({ postId: nlpPostId.trim() });
      const crawlData = response?.data;
      const message = `爬取成功 - 评论:${crawlData?.commentsCount || 0} 转发:${crawlData?.repostsCount || 0}`;
      addExecution('crawl', { postId: nlpPostId }, 'success', message);
      logger.info('Post crawled', response);
    } catch (error: any) {
      addExecution('crawl', { postId: nlpPostId }, 'error', error?.message || '爬取失败');
      logger.error('Failed to crawl post', error);
    } finally {
      setNlpLoading(false);
    }
  };

  const handleTriggerNLP = async () => {
    if (!nlpPostId.trim()) {
      alert('请输入帖子 ID');
      return;
    }

    setNlpLoading(true);
    addExecution('nlp', { postId: nlpPostId }, 'pending');

    try {
      const response = await WorkflowAPI.triggerNLP({ postId: nlpPostId.trim() });
      addExecution('nlp', { postId: nlpPostId }, 'success', response?.message || 'NLP 任务已触发');
      logger.info('NLP task triggered', response);
    } catch (error: any) {
      addExecution('nlp', { postId: nlpPostId }, 'error', error?.message || '触发失败');
      logger.error('Failed to trigger NLP task', error);
    } finally {
      setNlpLoading(false);
    }
  };

  const handleCrawlAndAnalyze = async () => {
    if (!nlpPostId.trim()) {
      alert('请输入帖子 ID');
      return;
    }

    setNlpLoading(true);
    addExecution('crawl-and-analyze', { postId: nlpPostId }, 'pending');

    try {
      // 第一阶段：爬取
      logger.info('Step 1: Crawling post', { postId: nlpPostId });
      const crawlResponse = await WorkflowAPI.crawlPost({ postId: nlpPostId.trim() });

      if (!crawlResponse?.success) {
        throw new Error(crawlResponse?.message || '爬取失败');
      }

      const crawlData = crawlResponse?.data;
      logger.info('Step 1 completed: Post crawled', crawlData);

      // 第二阶段：NLP分析
      logger.info('Step 2: Triggering NLP analysis', { postId: nlpPostId });
      const nlpResponse = await WorkflowAPI.triggerNLP({ postId: nlpPostId.trim() });

      if (!nlpResponse?.success) {
        throw new Error(nlpResponse?.message || 'NLP触发失败');
      }

      const message = `完整流程成功 - 评论:${crawlData?.commentsCount || 0} 转发:${crawlData?.repostsCount || 0} - NLP已触发`;
      addExecution('crawl-and-analyze', { postId: nlpPostId }, 'success', message);
      setNlpPostId('');
      logger.info('Complete workflow finished', { crawlData, nlpResponse });
    } catch (error: any) {
      addExecution('crawl-and-analyze', { postId: nlpPostId }, 'error', error?.message || '流程失败');
      logger.error('Failed to execute crawl-and-analyze workflow', error);
    } finally {
      setNlpLoading(false);
    }
  };

  const handleBatchNLP = async () => {
    const postIds = batchPostIds
      .split(/[,\n]/)
      .map((id) => id.trim())
      .filter(Boolean);

    if (postIds.length === 0) {
      alert('请输入至少一个帖子 ID（用逗号或换行分隔）');
      return;
    }

    setBatchLoading(true);
    addExecution('batch-nlp', { postIds }, 'pending');

    try {
      const response = await WorkflowAPI.batchNLP({ postIds });
      addExecution('batch-nlp', { postIds }, 'success', response?.message || '批量 NLP 任务已触发');
      setBatchPostIds('');
      logger.info('Batch NLP task triggered', response);
    } catch (error: any) {
      addExecution('batch-nlp', { postIds }, 'error', error?.message || '批量触发失败');
      logger.error('Failed to trigger batch NLP task', error);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleSearchWeibo = async () => {
    if (!searchKeyword.trim() || !searchStartDate || !searchEndDate) {
      alert('请填写所有搜索字段');
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
      const response = await WorkflowAPI.searchWeibo(params);
      addExecution('search', params, 'success', response?.message || '微博搜索已完成');
      logger.info('Weibo search completed', response);
    } catch (error: any) {
      addExecution('search', params, 'error', error?.message || '搜索失败');
      logger.error('Failed to search Weibo', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // ========== 渲染辅助函数 ==========
  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      running: 'bg-green-500/20 text-green-400 border-green-500/30',
      inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      stopped: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30',
      pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      success: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[status as keyof typeof styles] || styles.inactive}`}>
        {status}
      </span>
    );
  };

  const getTaskTypeLabel = (type: TaskType) => {
    const labels = {
      crawl: '爬取详情',
      nlp: 'NLP 分析',
      'crawl-and-analyze': '爬取+分析',
      'batch-nlp': '批量 NLP',
      search: '微博搜索',
    };
    return labels[type];
  };

  // ========== 渲染 ==========
  return (
    <div className="dashboard-no-scroll relative h-full">
      <div className="absolute top-0 left-0 right-0 bottom-0 dashboard-main-content">
        {/* 左侧：工作流状态和执行记录 */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-hidden">
          {/* 工作流状态卡片 */}
          <motion.div
            className="glass-card p-4 !h-auto flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-lg font-bold mb-4 text-foreground">工作流状态</h2>
            {workflowStatus ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">NLP 队列</span>
                  {getStatusBadge(workflowStatus.nlpQueue)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">工作流引擎</span>
                  {getStatusBadge(workflowStatus.workflowEngine)}
                </div>
                {workflowStatus.queueDepth !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">队列深度</span>
                    <span className="text-sm font-medium text-foreground">{workflowStatus.queueDepth}</span>
                  </div>
                )}
                {workflowStatus.lastExecution && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">最后执行</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(workflowStatus.lastExecution).toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <LoadingSpinner size="small" text="加载中..." />
            )}
          </motion.div>

          {/* 执行记录卡片 */}
          <motion.div
            className="glass-card p-4 flex-1 overflow-hidden flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h2 className="text-lg font-bold mb-4 text-foreground">执行记录</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {executions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无执行记录</p>
              ) : (
                executions.map((exec) => (
                  <div key={exec.id} className="bg-muted/30 rounded p-3 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-foreground">{getTaskTypeLabel(exec.type)}</span>
                      {getStatusBadge(exec.status)}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>时间: {new Date(exec.timestamp).toLocaleString('zh-CN')}</div>
                      <div className="truncate">参数: {JSON.stringify(exec.params)}</div>
                      {exec.message && <div className="text-xs italic">{exec.message}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* 右侧：任务触发面板 */}
        <div className="col-span-12 lg:col-span-8 h-full min-h-0 relative overflow-hidden">
          <div className="absolute left-0 right-0 top-0 bottom-0 overflow-y-auto overflow-x-hidden crawler-control-scroll-wrapper">
            <div className="flex flex-col gap-4 py-1">
              {/* 单任务爬取与分析 */}
              <motion.div
                className="glass-card p-4 crawler-control-scrollable"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <h2 className="text-lg font-bold mb-4 text-foreground">微博帖子爬取与分析</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">帖子 ID</label>
                    <input
                      type="text"
                      value={nlpPostId}
                      onChange={(e) => setNlpPostId(e.target.value)}
                      placeholder="例如: 5095814444178803"
                      className="w-full px-3 py-2 !bg-gray-100 dark:!bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                      disabled={nlpLoading}
                    />
                  </div>

                  {/* 主要操作：爬取+分析 */}
                  <button
                    onClick={handleCrawlAndAnalyze}
                    disabled={nlpLoading}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {nlpLoading ? '执行中...' : '🚀 爬取并分析（推荐）'}
                  </button>

                  {/* 分步操作 */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCrawlPost}
                      disabled={nlpLoading}
                      className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {nlpLoading ? '...' : '📥 仅爬取'}
                    </button>
                    <button
                      onClick={handleTriggerNLP}
                      disabled={nlpLoading}
                      className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {nlpLoading ? '...' : '🧠 仅分析'}
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    💡 提示："爬取并分析"会先从微博爬取帖子详情（含评论、转发），然后自动触发 NLP 分析
                  </p>
                </div>
              </motion.div>

              {/* NLP 批量任务触发 */}
              <motion.div
                className="glass-card p-4 crawler-control-scrollable"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <h2 className="text-lg font-bold mb-4 text-foreground">批量触发 NLP 分析</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      帖子 ID 列表（用逗号或换行分隔）
                    </label>
                    <textarea
                      value={batchPostIds}
                      onChange={(e) => setBatchPostIds(e.target.value)}
                      placeholder="例如:&#10;5095814444178803&#10;5095814444178804&#10;5095814444178805"
                      rows={5}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground resize-none transition-colors"
                      disabled={batchLoading}
                    />
                  </div>
                  <button
                    onClick={handleBatchNLP}
                    disabled={batchLoading}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {batchLoading ? '触发中...' : '批量触发 NLP 分析'}
                  </button>
                </div>
              </motion.div>

              {/* 微博搜索触发 */}
              <motion.div
                className="glass-card p-4 crawler-control-scrollable"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <h2 className="text-lg font-bold mb-4 text-foreground">触发微博关键词搜索</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">关键词</label>
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="例如: 人工智能"
                      className="w-full px-3 py-2 !bg-gray-100 dark:!bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                      disabled={searchLoading}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">开始日期</label>
                      <input
                        type="date"
                        value={searchStartDate}
                        onChange={(e) => setSearchStartDate(e.target.value)}
                        className="w-full px-3 py-2 !bg-gray-100 dark:!bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                        disabled={searchLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">结束日期</label>
                      <input
                        type="date"
                        value={searchEndDate}
                        onChange={(e) => setSearchEndDate(e.target.value)}
                        className="w-full px-3 py-2 !bg-gray-100 dark:!bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                        disabled={searchLoading}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">页码（可选）</label>
                    <input
                      type="number"
                      value={searchPage}
                      onChange={(e) => setSearchPage(e.target.value)}
                      placeholder="1"
                      min="1"
                      className="w-full px-3 py-2 !bg-gray-100 dark:!bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                      disabled={searchLoading}
                    />
                  </div>
                  <button
                    onClick={handleSearchWeibo}
                    disabled={searchLoading}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {searchLoading ? '搜索中...' : '开始搜索'}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    注意：微博搜索会自动将找到的帖子推送到 NLP 队列进行分析
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrawlerControl;
