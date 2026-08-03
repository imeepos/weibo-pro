import React from 'react';
import { motion } from 'framer-motion';

export const NLP_UNSUPPORTED_MESSAGE = '当前主分支未接入 NLP 手动触发接口，暂只支持状态查看、详情爬取和关键词搜索。';

interface CrawlAndAnalyzePanelProps {
  nlpPostId: string;
  onNlpPostIdChange: (value: string) => void;
  nlpLoading: boolean;
  onCrawlPost: () => void;
  onTriggerNLP: () => void;
  onCrawlAndAnalyze: () => void;
}

export function CrawlAndAnalyzePanel({
  nlpPostId,
  onNlpPostIdChange,
  nlpLoading,
  onCrawlPost,
  onTriggerNLP,
  onCrawlAndAnalyze,
}: CrawlAndAnalyzePanelProps) {
  return (
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
            onChange={(e) => onNlpPostIdChange(e.target.value)}
            placeholder="例如: 5095814444178803"
            className="w-full px-3 py-2 !bg-gray-100 dark:!bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
            disabled={nlpLoading}
          />
        </div>

        {/* 主要操作：爬取+分析 */}
        <button
          onClick={onCrawlAndAnalyze}
          disabled
          className="w-full px-4 py-2 bg-muted text-muted-foreground rounded font-medium disabled:opacity-80 disabled:cursor-not-allowed transition-colors"
        >
          🚫 爬取并分析（未接通）
        </button>

        {/* 分步操作 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCrawlPost}
            disabled={nlpLoading}
            className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {nlpLoading ? '...' : '📥 启动详情爬取'}
          </button>
          <button
            onClick={onTriggerNLP}
            disabled
            className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            🧠 仅分析
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {NLP_UNSUPPORTED_MESSAGE}
        </p>
      </div>
    </motion.div>
  );
}

interface BatchNlpPanelProps {
  batchPostIds: string;
  onBatchPostIdsChange: (value: string) => void;
  batchLoading: boolean;
  onBatchNLP: () => void;
}

export function BatchNlpPanel({
  batchPostIds,
  onBatchPostIdsChange,
  batchLoading,
  onBatchNLP,
}: BatchNlpPanelProps) {
  return (
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
            onChange={(e) => onBatchPostIdsChange(e.target.value)}
            placeholder="例如:&#10;5095814444178803&#10;5095814444178804&#10;5095814444178805"
            rows={5}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground resize-none transition-colors"
            disabled={batchLoading}
          />
        </div>
        <button
          onClick={onBatchNLP}
          disabled
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          批量触发 NLP 分析
        </button>
        <p className="text-xs text-muted-foreground">
          {NLP_UNSUPPORTED_MESSAGE}
        </p>
      </div>
    </motion.div>
  );
}

interface SearchPanelProps {
  searchKeyword: string;
  onSearchKeywordChange: (value: string) => void;
  searchStartDate: string;
  onSearchStartDateChange: (value: string) => void;
  searchEndDate: string;
  onSearchEndDateChange: (value: string) => void;
  searchPage: string;
  onSearchPageChange: (value: string) => void;
  searchLoading: boolean;
  onSearch: () => void;
}

export function SearchPanel({
  searchKeyword,
  onSearchKeywordChange,
  searchStartDate,
  onSearchStartDateChange,
  searchEndDate,
  onSearchEndDateChange,
  searchPage,
  onSearchPageChange,
  searchLoading,
  onSearch,
}: SearchPanelProps) {
  return (
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
            onChange={(e) => onSearchKeywordChange(e.target.value)}
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
              onChange={(e) => onSearchStartDateChange(e.target.value)}
              className="w-full px-3 py-2 !bg-gray-100 dark:!bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
              disabled={searchLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">结束日期</label>
            <input
              type="date"
              value={searchEndDate}
              onChange={(e) => onSearchEndDateChange(e.target.value)}
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
            onChange={(e) => onSearchPageChange(e.target.value)}
            placeholder="1"
            min="1"
            className="w-full px-3 py-2 !bg-gray-100 dark:!bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
            disabled={searchLoading}
          />
        </div>
        <button
          onClick={onSearch}
          disabled={searchLoading}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {searchLoading ? '搜索中...' : '开始搜索爬取'}
        </button>
        <p className="text-xs text-muted-foreground">
          当前搜索会启动微博关键词爬取；日期范围暂仅作为记录项，后端 crawler 尚未按日期过滤。
        </p>
      </div>
    </motion.div>
  );
}
