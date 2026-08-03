/**
 * 社区演化时间线 —— 图表展示子组件
 *
 * 仅负责社区数量/模块度两个 ECharts 面板的渲染，option 由上层传入。
 */
import React from 'react';
import type { CommunityEvolutionAnalysis } from '@sker/sdk';
import { BarChart3, TrendingUp } from 'lucide-react';
import { EChart, type EChartsOption } from '@sker/ui/components/ui/echart';

/** 社区数量变化图表面板 */
export function CommunityCountChartPanel({
  data,
  option,
}: {
  data: CommunityEvolutionAnalysis;
  option: EChartsOption;
}) {
  return (
    <div className="pt-2 border-t border-border">
      <div className="text-xs font-semibold text-muted-foreground mb-2">社区数量变化</div>
      {data.timeSlices.length > 1 ? (
        <EChart
          option={option}
          height={96}
          className="w-full"
          data-testid="community-count-chart"
        />
      ) : (
        <div
          className="h-24 rounded bg-muted/30 border border-border flex items-center justify-center text-xs text-muted-foreground"
          data-testid="community-count-chart"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          数据点不足
        </div>
      )}
    </div>
  );
}

/** 模块度变化图表面板 */
export function ModularityChartPanel({
  data,
  option,
}: {
  data: CommunityEvolutionAnalysis;
  option: EChartsOption;
}) {
  return (
    <div className="pt-2 border-t border-border">
      <div className="text-xs font-semibold text-muted-foreground mb-2">模块度变化</div>
      {data.timeSlices.length > 1 ? (
        <EChart option={option} height={96} className="w-full" data-testid="modularity-chart" />
      ) : (
        <div
          className="h-24 rounded bg-muted/30 border border-border flex items-center justify-center text-xs text-muted-foreground"
          data-testid="modularity-chart"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          数据点不足
        </div>
      )}
    </div>
  );
}
