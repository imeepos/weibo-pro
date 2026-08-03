/**
 * 情感转变组件 —— 展示性子组件
 *
 * 仅负责指标徽章与元数据统计区的渲染，无业务副作用。
 */
import React from 'react';
import type { SentimentTransitionAnalysis } from '@sker/sdk';
import { formatNumber } from './SentimentTransition.utils';

/** 顶部稳定性/极化指数指标徽章 */
export function MetricIndicators({ data }: { data: SentimentTransitionAnalysis }) {
  return (
    <div className="flex gap-5 flex-wrap">
      <div className="flex gap-2 items-center px-4 py-2 bg-muted rounded-md">
        <span className="font-medium text-muted-foreground">稳定性指数:</span>
        <span className="text-primary font-semibold text-base">
          {formatNumber(Math.round(data.stabilityIndex * 100))}%
        </span>
      </div>
      <div className="flex gap-2 items-center px-4 py-2 bg-muted rounded-md">
        <span className="font-medium text-muted-foreground">极化指数:</span>
        <span className="text-primary font-semibold text-base">
          {formatNumber(Math.round(data.polarizationIndex * 100))}%
        </span>
      </div>
    </div>
  );
}

/** 单条统计项 */
function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-3.5 py-2.5 bg-muted rounded-md">
      <span className="text-[13px] text-muted-foreground font-medium">{label}</span>
      <span className="text-sm text-foreground font-semibold">{value}</span>
    </div>
  );
}

/** 底部分析统计区（元数据） */
export function AnalysisMetadata({
  metadata,
}: {
  metadata: NonNullable<SentimentTransitionAnalysis['metadata']>;
}) {
  return (
    <div className="mt-5 p-4 bg-card border border-border rounded-lg">
      <h4 className="m-0 mb-3 text-base font-semibold text-foreground">分析统计</h4>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <StatItem label="总时间点:" value={formatNumber(metadata.totalTimePoints)} />
        <StatItem label="分析时间点:" value={formatNumber(metadata.analyzedTimePoints)} />
        <StatItem label="跳过边界点:" value={formatNumber(metadata.skippedBoundaryPoints)} />
        <StatItem label="计算方法:" value={metadata.calculationMethod} />
      </div>
    </div>
  );
}
