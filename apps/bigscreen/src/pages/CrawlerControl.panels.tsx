import React from 'react';
import { motion } from 'framer-motion';

export const CRAWLER_SUPPORTED_MESSAGE = '当前支持微博详情爬取和关键词搜索爬取，任务状态会在左侧执行记录中展示。';

interface CrawlAndAnalyzePanelProps {
  nlpPostId: string;
  onNlpPostIdChange: (value: string) => void;
  nlpLoading: boolean;
  onCrawlPost: () => void;
}

export function CrawlAndAnalyzePanel({
  nlpPostId,
  onNlpPostIdChange,
  nlpLoading,
  onCrawlPost,
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

        <button
          onClick={onCrawlPost}
          disabled={nlpLoading}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {nlpLoading ? '启动中...' : '启动详情爬取'}
        </button>

        <p className="text-xs text-muted-foreground">
          {CRAWLER_SUPPORTED_MESSAGE}
        </p>
      </div>
    </motion.div>
  );
}

interface SearchPanelProps {
  searchKeyword: string;
  onSearchKeywordChange: (value: string) => void;
  searchPage: string;
  onSearchPageChange: (value: string) => void;
  searchLoading: boolean;
  onSearch: () => void;
}

export function SearchPanel({
  searchKeyword,
  onSearchKeywordChange,
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
          当前搜索会启动微博关键词爬取任务。
        </p>
      </div>
    </motion.div>
  );
}
