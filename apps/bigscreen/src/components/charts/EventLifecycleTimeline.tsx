import React, { useState } from 'react';
import type { EventLifecycle, LifecyclePhase } from '../../hooks/useEventLifecycle';
import { ChevronRight, ChevronLeft, TrendingUp, Clock, Activity, Flame } from 'lucide-react';

// 阶段名称中文映射
const PHASE_NAME_MAP: Record<string, string> = {
  emergence: '萌芽',
  growth: '增长',
  peak: '高峰',
  decline: '衰退',
  dormant: '沉寂',
};

// 阶段颜色映射
const PHASE_COLOR_MAP: Record<string, string> = {
  emergence: '#22c55e', // green-500
  growth: '#3b82f6', // blue-500
  peak: '#ef4444', // red-500
  decline: '#f59e0b', // amber-500
  dormant: '#6b7280', // gray-500
};

interface EventLifecycleTimelineProps {
  lifecycle?: EventLifecycle;
  onPhaseClick?: (phase: LifecyclePhase) => void;
  className?: string;
  defaultCollapsed?: boolean;
}

export const EventLifecycleTimeline: React.FC<EventLifecycleTimelineProps> = ({
  lifecycle,
  onPhaseClick,
  className = '',
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // 空数据处理
  if (!lifecycle || lifecycle.phases.length === 0) {
    return (
      <div
        className={`bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg ${className}`}
        style={{ width: '320px' }}
      >
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            事件生命周期
          </h3>
        </div>
        <div className="p-4 text-center text-muted-foreground text-xs">
          暂无生命周期数据
        </div>
      </div>
    );
  }

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 计算热度最大值（用于归一化）
  const maxHotness = Math.max(...lifecycle.phases.map(p => p.avgHotness), 1);

  // 渲染单个阶段
  const renderPhase = (phase: LifecyclePhase, index: number) => {
    const isCurrentPhase = phase.name === lifecycle.currentPhase;
    const phaseColor = PHASE_COLOR_MAP[phase.name] || '#6b7280';
    const hotnessPercent = (phase.avgHotness / maxHotness) * 100;

    return (
      <div
        key={`${phase.name}-${index}`}
        data-testid="lifecycle-phase"
        data-phase-name={phase.name}
        data-phase-color={phase.name === 'emergence' ? 'green' : phase.name === 'peak' ? 'red' : 'other'}
        className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
          isCurrentPhase ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
        }`}
        onClick={() => onPhaseClick?.(phase)}
      >
        {/* 阶段头部 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: phaseColor }}
            />
            <span className="text-sm font-semibold">
              {PHASE_NAME_MAP[phase.name] || phase.name}
            </span>
            {isCurrentPhase && (
              <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                当前
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {phase.duration} 小时
          </div>
        </div>

        {/* 阶段信息 */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" />
            <span className="text-muted-foreground">热度:</span>
            <span className="font-medium">{phase.avgHotness.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-blue-500" />
            <span className="text-muted-foreground">帖子:</span>
            <span className="font-medium">{phase.keyMetrics.posts}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-muted-foreground">用户:</span>
            <span className="font-medium">{phase.keyMetrics.users}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">情感:</span>
            <span className="font-medium">{(phase.keyMetrics.sentiment * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* 热度条 */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            data-testid="hotness-data-point"
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${hotnessPercent}%`,
              backgroundColor: phaseColor,
            }}
          />
        </div>

        {/* 时间范围 */}
        <div className="mt-1 text-[10px] text-muted-foreground">
          {formatTime(phase.startTime)} - {formatTime(phase.endTime)}
        </div>
      </div>
    );
  };

  // 渲染热度曲线图
  const renderHotnessChart = () => {
    const maxHotnessValue = Math.max(...lifecycle.phases.map(p => p.avgHotness), 100);

    return (
      <div
        data-testid="hotness-chart"
        className="mb-4 p-3 bg-muted/30 rounded-lg"
      >
        <div className="text-xs font-semibold mb-2 flex items-center gap-1">
          <Flame className="w-3 h-3 text-orange-500" />
          热度曲线
        </div>
        <div className="relative h-24">
          {/* Y轴标签 */}
          <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] text-muted-foreground">
            <span>{maxHotnessValue.toFixed(0)}</span>
            <span>{(maxHotnessValue / 2).toFixed(0)}</span>
            <span>0</span>
          </div>

          {/* 曲线区域 */}
          <div className="ml-8 h-full flex items-end gap-1">
            {lifecycle.phases.map((phase, index) => {
              const heightPercent = (phase.avgHotness / maxHotnessValue) * 100;
              const color = PHASE_COLOR_MAP[phase.name];

              return (
                <div
                  key={index}
                  data-testid="hotness-data-point"
                  className="flex-1 flex flex-col items-center"
                >
                  <div
                    className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: color,
                      minHeight: '4px',
                    }}
                    title={`${PHASE_NAME_MAP[phase.name]}: ${phase.avgHotness.toFixed(1)}`}
                  />
                  <div className="text-[8px] text-muted-foreground mt-1 truncate w-full text-center">
                    {PHASE_NAME_MAP[phase.name]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`absolute top-4 left-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg transition-all duration-300 ${className}`}
      style={{ width: isCollapsed ? '40px' : '340px' }}
    >
      {/* 折叠按钮 */}
      <button
        data-testid="lifecycle-collapse-button"
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {!isCollapsed && (
        <>
          {/* 标题 */}
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              事件生命周期
            </h3>
          </div>

          {/* 内容区域 */}
          <div className="p-3 max-h-[500px] overflow-y-auto scrollbar-hide">
            {/* 热度曲线图 */}
            {renderHotnessChart()}

            {/* 阶段时间轴 */}
            <div className="mb-3">
              <div className="text-xs font-semibold mb-2">阶段时间轴</div>
              <div className="space-y-2">
                {lifecycle.phases.map((phase, index) => renderPhase(phase, index))}
              </div>
            </div>

            {/* 统计信息 */}
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">总生命周期:</span>
                <span className="font-medium">{lifecycle.totalLifespan} 小时</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">当前阶段:</span>
                <span className="font-medium">
                  {lifecycle.currentPhase ? PHASE_NAME_MAP[lifecycle.currentPhase] : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">预计结束:</span>
                <span className="font-medium">{formatTime(lifecycle.predictedEndTime)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EventLifecycleTimeline;
