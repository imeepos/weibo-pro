/**
 * TokenUsage - Token 使用统计展示
 *
 * 优雅即简约：
 * - 视觉层次清晰：总量 > 分类 > 百分比
 * - 颜色语义化：绿色安全 / 黄色警告 / 红色危险
 * - 信息密度适中：紧凑但可读
 */

interface TokenUsageProps {
  used: number;
  total: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

export function TokenUsage({ used, total, input, output, cacheRead, cacheCreation }: TokenUsageProps) {
  const percentage = (used / total) * 100;
  const cache = cacheRead + cacheCreation;

  // 颜色语义
  const getColor = () => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getBarColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* 主要统计 */}
      <div className={`font-mono ${getColor()}`}>
        {used.toLocaleString()} / {total.toLocaleString()}
      </div>

      {/* 进度条 */}
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${getBarColor()} transition-all`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>

      {/* 百分比 */}
      <div className={`font-mono ${getColor()}`}>{percentage.toFixed(1)}%</div>

      {/* 分类统计（悬浮显示） */}
      <div className="group relative">
        <div className="text-muted-foreground cursor-help">ⓘ</div>
        <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50">
          <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">输入:</span>
                <span className="text-foreground">{input.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">输出:</span>
                <span className="text-foreground">{output.toLocaleString()}</span>
              </div>
              {cache > 0 && (
                <div className="flex justify-between gap-4 pt-1.5 border-t border-border">
                  <span className="text-muted-foreground">缓存:</span>
                  <span className="text-green-500">{cache.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
