import React, { useState, useEffect } from 'react';
import { root } from '@sker/core';
import {
  LlmChatLogsController,
  type PromptAnalysisResult,
  type PromptAnalysisItem
} from '@sker/sdk';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@sker/ui/components/ui/dialog';
import { Spinner } from '@sker/ui/components/ui/spinner';
import { SimplePagination } from '@sker/ui/components/ui/simple-pagination';
import { DownloadIcon } from 'lucide-react';

interface PromptAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIME_RANGES = [
  { label: '最近1小时', value: 1 },
  { label: '最近6小时', value: 6 },
  { label: '最近24小时', value: 24 },
  { label: '最近7天', value: 24 * 7 },
  { label: '最近30天', value: 24 * 30 },
  { label: '全部', value: 0 }
];

const TYPE_LABELS: Record<string, string> = {
  system: 'System',
  user: 'User',
  assistant: 'Assistant',
  tool: 'Tool'
};

export const PromptAnalysisDialog: React.FC<PromptAnalysisDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PromptAnalysisResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [timeRange, setTimeRange] = useState(1); // 默认最近1小时
  const [selectedType, setSelectedType] = useState<string>('all'); // 默认显示全部

  const controller = root.get(LlmChatLogsController);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (timeRange > 0) {
        const now = new Date();
        endDate = now.toISOString();
        const start = new Date(now.getTime() - timeRange * 60 * 60 * 1000);
        startDate = start.toISOString();
      }

      const data = await controller.analyzePrompts(startDate, endDate);
      setResult(data);
      setPage(1);
    } catch (error) {
      console.error('[PromptAnalysisDialog] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 按类型筛选
  const filteredItems = result?.items.filter(item =>
    selectedType === 'all' || item.type === selectedType
  ) || [];

  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredItems.length / pageSize);

  const exportToMarkdown = () => {
    if (!result) return;

    const timeRangeLabel = TIME_RANGES.find(r => r.value === timeRange)?.label || '全部';
    const now = new Date().toLocaleString('zh-CN');

    let markdown = `# 提示词分析报告\n\n`;
    markdown += `**生成时间**: ${now}\n\n`;
    markdown += `**时间范围**: ${timeRangeLabel}\n\n`;

    // 统计摘要
    markdown += `## 统计摘要\n\n`;
    markdown += `- **提示词总数**: ${result.total} 个不同提示词\n`;
    markdown += `- **总使用次数**: ${result.totalUsage} 次\n`;
    markdown += `- **平均使用次数**: ${(result.totalUsage / result.total).toFixed(2)} 次/提示词\n\n`;

    // 按类型统计
    markdown += `### 按类型统计\n\n`;
    markdown += `| 类型 | 提示词数量 | 总使用次数 |\n`;
    markdown += `|------|-----------|----------|\n`;
    for (const stat of result.byType) {
      const label = TYPE_LABELS[stat.type] || stat.type;
      markdown += `| ${label} | ${stat.count} | ${stat.usage} |\n`;
    }
    markdown += `\n`;

    // 按类型分组的详细列表
    markdown += `## 详细列表\n\n`;

    for (const stat of result.byType) {
      const typeLabel = TYPE_LABELS[stat.type] || stat.type;
      const typeItems = result.items.filter(item => item.type === stat.type);

      markdown += `### ${typeLabel} (${typeItems.length} 个)\n\n`;

      typeItems
        .sort((a, b) => b.count - a.count)
        .forEach((item, index) => {
          markdown += `#### ${index + 1}. 使用次数: ${item.count}\n\n`;
          if (item.name) {
            markdown += `**工具名称**: ${item.name}\n\n`;
          }
          markdown += `\`\`\`\n${item.content}\n\`\`\`\n\n`;
          markdown += `*Hash: ${item.hash}*\n\n`;
          markdown += `---\n\n`;
        });
    }

    // 触发下载
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompt-analysis-${new Date().getTime()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!min-w-[60vw] max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>提示词分析</span>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="rounded-md border bg-background px-3 py-1.5 text-xs"
              >
                {TIME_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setPage(1);
                }}
                className="rounded-md border bg-background px-3 py-1.5 text-xs"
              >
                <option value="all">全部类型</option>
                {result?.byType.map((stat) => (
                  <option key={stat.type} value={stat.type}>
                    {TYPE_LABELS[stat.type] || stat.type} ({stat.count})
                  </option>
                ))}
              </select>
              {result && (
                <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">
                  {selectedType === 'all'
                    ? `共 ${result.total} 个不同提示词，总使用 ${result.totalUsage} 次`
                    : `${filteredItems.length} 个提示词`
                  }
                </span>
              )}
              {result && (
                <button
                  onClick={exportToMarkdown}
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
                  title="导出为 Markdown"
                >
                  <DownloadIcon className="size-3" />
                  导出
                </button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : result && filteredItems.length > 0 ? (
            <div className="space-y-3">
              {paginatedItems.map((item, index) => (
                <div
                  key={item.hash}
                  className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        #{(page - 1) * pageSize + index + 1}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.type === 'system'
                          ? 'bg-blue-100 text-blue-800'
                          : item.type === 'user'
                          ? 'bg-green-100 text-green-800'
                          : item.type === 'assistant'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {TYPE_LABELS[item.type] || item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        使用次数
                      </span>
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {item.count}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words text-foreground">
                    {item.content}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground font-mono">
                    Hash: {item.hash}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              未找到提示词数据
            </div>
          )}
        </div>

        {result && filteredItems.length > 0 && (
          <div className="border-t px-6 py-4">
            <SimplePagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
