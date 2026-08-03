/**
 * 社区演化时间线 —— 面板外壳与状态视图
 *
 * 仅负责面板根容器、标题栏以及加载/错误/空状态、统计与趋势预测等
 * 区块的渲染，无业务副作用。
 */
import React from 'react';
import type { CommunityEvolutionAnalysis } from '@sker/sdk';
import { Activity, AlertCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { PANEL_WIDTH } from './CommunityEvolutionTimeline.constants';

/** 面板根容器 */
function PanelContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg ${className ?? ''}`}
      style={{ width: PANEL_WIDTH }}
    >
      {children}
    </div>
  );
}

/** 标题栏（可选折叠按钮） */
export function PanelHeader({
  isCollapsed,
  onToggle,
  showCollapseButton = true,
}: {
  isCollapsed: boolean;
  onToggle?: () => void;
  showCollapseButton?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3 border-b border-border ${
        showCollapseButton ? 'flex items-center justify-between' : ''
      }`}
    >
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Activity className="w-4 h-4" />
        社区演化追踪
      </h3>
      {showCollapseButton && onToggle && (
        <button
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid="evolution-collapse-button"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

/** 加载状态 */
export function LoadingState({ className }: { className?: string }) {
  return (
    <PanelContainer className={className}>
      <PanelHeader isCollapsed={false} showCollapseButton={false} />
      <div className="p-4 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
        <Clock className="w-4 h-4 animate-spin" />
        加载中...
      </div>
    </PanelContainer>
  );
}

/** 错误状态 */
export function ErrorState({ className, message }: { className?: string; message: string }) {
  return (
    <PanelContainer className={className}>
      <PanelHeader isCollapsed={false} showCollapseButton={false} />
      <div className="p-4 text-center text-destructive text-xs flex items-center justify-center gap-2">
        <AlertCircle className="w-4 h-4" />
        加载失败: {message}
      </div>
    </PanelContainer>
  );
}

/** 空数据状态 */
export function EmptyState({
  className,
  isCollapsed,
  onToggle,
}: {
  className?: string;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <PanelContainer className={className}>
      <PanelHeader isCollapsed={isCollapsed} onToggle={onToggle} />
      {!isCollapsed && (
        <div className="p-4 text-center text-muted-foreground text-xs">暂无演化数据</div>
      )}
    </PanelContainer>
  );
}

/** 统计信息（稳定性指数 / 预测社区数） */
export function StatsPanel({ data }: { data: CommunityEvolutionAnalysis }) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <div className="text-xs text-muted-foreground mb-1">稳定性指数</div>
        <div className="text-lg font-semibold text-primary">
          {(data.overallStability * 100).toFixed(0)}%
        </div>
      </div>
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <div className="text-xs text-muted-foreground mb-1">预测社区数</div>
        <div className="text-lg font-semibold text-primary">
          {data.trendPrediction.predictedCommunityCount}
        </div>
      </div>
    </div>
  );
}

/** 趋势预测面板 */
export function TrendPredictionPanel({ data }: { data: CommunityEvolutionAnalysis }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border">
      <div className="text-xs font-semibold text-muted-foreground mb-2">趋势预测</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">预测模块度: </span>
          <span className="font-semibold">{data.trendPrediction.predictedModularity.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">置信度: </span>
          <span className="font-semibold">{(data.trendPrediction.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
