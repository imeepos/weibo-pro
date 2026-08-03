import React from 'react';
import { motion } from 'framer-motion';
import { Spinner } from '@sker/ui/components/ui/spinner';
import type { CrawlerControlStatusSummary } from '@/services/api/crawler';
import type { TaskExecution, TaskType } from './CrawlerControl.types';

export const getStatusBadge = (status: string) => {
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

export const getTaskTypeLabel = (type: TaskType) => {
  const labels = {
    crawl: '爬取详情',
    nlp: 'NLP 分析',
    'crawl-and-analyze': '爬取+分析',
    'batch-nlp': '批量 NLP',
    search: '微博搜索',
  };
  return labels[type];
};

interface WorkflowStatusCardProps {
  workflowStatus: CrawlerControlStatusSummary | null;
}

export function WorkflowStatusCard({ workflowStatus }: WorkflowStatusCardProps) {
  return (
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
        <Spinner />
      )}
    </motion.div>
  );
}

interface ExecutionRecordsCardProps {
  executions: TaskExecution[];
}

export function ExecutionRecordsCard({ executions }: ExecutionRecordsCardProps) {
  return (
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
  );
}
