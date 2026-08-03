import type { LevelStats, SpreadBreadthAnalysis } from '@sker/sdk';

// 格式化数字（添加千分位分隔符）
export const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN');
};

interface StatCardsProps {
  data: SpreadBreadthAnalysis;
}

export function StatCards({ data }: StatCardsProps) {
  return (
    <div className="grid grid-cols-5 gap-4 mb-4">
      <div className="bg-card border rounded-lg p-4">
        <div className="text-sm text-muted-foreground mb-1">总转发数</div>
        <div className="text-2xl font-semibold">{formatNumber(data.totalReposts)}</div>
      </div>
      <div className="bg-card border rounded-lg p-4">
        <div className="text-sm text-muted-foreground mb-1">独立转发者</div>
        <div className="text-2xl font-semibold">{formatNumber(data.uniqueReposters)}</div>
      </div>
      <div className="bg-card border rounded-lg p-4">
        <div className="text-sm text-muted-foreground mb-1">传播深度</div>
        <div className="text-2xl font-semibold">{data.spreadDepth}层</div>
      </div>
      <div className="bg-card border rounded-lg p-4">
        <div className="text-sm text-muted-foreground mb-1">传播宽度</div>
        <div className="text-2xl font-semibold">{data.spreadWidth.toFixed(1)}</div>
      </div>
      <div className="bg-card border rounded-lg p-4">
        <div className="text-sm text-muted-foreground mb-1">广度指数</div>
        <div className="text-2xl font-semibold">{data.breadthIndex.toFixed(2)}</div>
      </div>
    </div>
  );
}

interface LevelStatsPanelProps {
  levelStats: LevelStats[];
}

export function LevelStatsPanel({ levelStats }: LevelStatsPanelProps) {
  if (levelStats.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border bg-card p-4">
      <h4 className="mb-3 text-sm font-medium text-foreground">层级分布</h4>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {levelStats.map((stat) => (
          <div key={stat.level} className="rounded-md border border-border/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">第{stat.level}层</span>
              <span className="text-xs text-muted-foreground">
                {formatNumber(stat.totalUsers)} 用户 / {formatNumber(stat.totalReposts)} 转发
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded bg-muted/50 px-2 py-1.5">
                <div className="text-muted-foreground">VIP</div>
                <div className="font-medium">
                  VIP {formatNumber(stat.byUserType.vip.count)}人 / {formatNumber(stat.byUserType.vip.reposts)}转发
                </div>
              </div>
              <div className="rounded bg-muted/50 px-2 py-1.5">
                <div className="text-muted-foreground">普通</div>
                <div className="font-medium">
                  普通 {formatNumber(stat.byUserType.ordinary.count)}人 / {formatNumber(stat.byUserType.ordinary.reposts)}转发
                </div>
              </div>
              <div className="rounded bg-muted/50 px-2 py-1.5">
                <div className="text-muted-foreground">认证</div>
                <div className="font-medium">
                  认证 {formatNumber(stat.byUserType.verified.count)}人 / {formatNumber(stat.byUserType.verified.reposts)}转发
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
