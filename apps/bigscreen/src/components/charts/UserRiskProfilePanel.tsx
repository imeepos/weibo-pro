import React from 'react';
import type { EventUserRiskProfile } from '@sker/sdk';

export function UserRiskProfilePanel({ data }: { data: EventUserRiskProfile }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="text-xs text-muted-foreground">总用户</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{data.totalUsers}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="text-xs text-muted-foreground">活跃用户</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{data.activeUsers}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="text-xs text-muted-foreground">异常用户</div>
          <div className="mt-2 text-2xl font-semibold text-destructive">{data.abnormalUserCount}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="text-xs text-muted-foreground">平均风险分</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{data.averageRiskScore}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="text-xs text-muted-foreground">风险分布</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-500">
              低风险 {data.riskDistribution.low}
            </span>
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-500">
              中风险 {data.riskDistribution.medium}
            </span>
            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-500">
              高风险 {data.riskDistribution.high}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="text-xs text-muted-foreground">高频异常信号</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.topSignals.length > 0 ? (
              data.topSignals.map((signal) => (
                <span
                  key={signal.type}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
                >
                  {signal.label} {signal.count}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">暂无</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
