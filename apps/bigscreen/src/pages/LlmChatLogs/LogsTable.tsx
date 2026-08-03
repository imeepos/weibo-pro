import React from 'react';
import { BarChart3Icon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { Skeleton } from '@sker/ui/components/ui/skeleton';
import { Badge } from '@sker/ui/components/ui/badge';
import { Button } from '@sker/ui/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@sker/ui/components/ui/table';
import type { LlmChatLogItem } from '@sker/sdk';
import { formatTokens, formatDate } from './utils';
import { HTTP_OK } from './constants';

interface LogsTableProps {
  logs: LlmChatLogItem[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const LogsLoading: React.FC = () => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);

const LogsEmpty: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <BarChart3Icon className="size-12 text-muted-foreground/50 mb-4" />
    <p className="text-lg font-medium">暂无日志数据</p>
    <p className="text-sm text-muted-foreground mt-1">尝试调整筛选条件或时间范围</p>
  </div>
);

const LogsTable: React.FC<LogsTableProps> = ({
  logs,
  loading,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (loading) {
    return <LogsLoading />;
  }

  if (logs.length === 0) {
    return <LogsEmpty />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>时间</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>模型</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>耗时</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead>状态码</TableHead>
            <TableHead>错误</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
              <TableCell>{log.providerName || log.providerId}</TableCell>
              <TableCell className="font-medium">{log.modelName}</TableCell>
              <TableCell>
                {log.isSuccess ? (
                  <CheckCircleIcon className="size-4 text-green-500" />
                ) : (
                  <XCircleIcon className="size-4 text-red-500" />
                )}
              </TableCell>
              <TableCell>{log.durationMs}ms</TableCell>
              <TableCell>{formatTokens(log.totalTokens || 0)}</TableCell>
              <TableCell>
                <Badge variant={log.statusCode === HTTP_OK ? 'default' : 'destructive'}>{log.statusCode}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground truncate max-w-xs" title={log.error}>
                {log.error || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {currentPage} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </>
  );
};

export default LogsTable;
