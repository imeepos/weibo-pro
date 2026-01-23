import React, { useEffect, useRef, useMemo, useState } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import { useEChartTheme } from '@sker/ui/hooks/use-echart-theme';
import * as echarts from 'echarts';
import type { CommentDepthAnalysis } from '@sker/sdk';
import type { EChartsOption } from 'echarts';

interface CommentThreadTreeProps {
  title?: string;
  height?: number;
  className?: string;
  data?: CommentDepthAnalysis | null;
  isLoading?: boolean;
  error?: Error | null;
  onClick?: (hotspot: { rootCommentId: string; replyCount: number }) => void;
}

const CommentThreadTree: React.FC<CommentThreadTreeProps> = ({
  title = '评论深度分析',
  height = 500,
  className,
  data,
  isLoading = false,
  error = null,
  onClick,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [expandedHotspots, setExpandedHotspots] = useState<Set<string>>(new Set());
  const { colors } = useEChartTheme();

  // 构建树状图配置
  const chartOption = useMemo<EChartsOption>(() => {
    if (!data || !data.depthDistribution || data.depthDistribution.length === 0) return {};

    const depthData = data.depthDistribution.map(d => ({
      name: `深度 ${d.depth}`,
      value: d.count,
      percentage: d.percentage,
    }));

    return {
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%',
      },
      title: {
        text: title,
        left: 'center',
        top: 10,
        textStyle: {
          color: colors.text,
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const param = params[0];
          return `
            <div style="padding: 12px; min-width: 200px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #e5e7eb;">
                ${param.name}
              </div>
              <div style="margin-bottom: 4px; color: #9ca3af;">
                讨论数: <span style="color: #fbbf24; font-weight: bold;">${param.value}</span>
              </div>
              <div style="color: #9ca3af;">
                占比: <span style="color: #60a5fa; font-weight: bold;">${param.data.percentage.toFixed(1)}%</span>
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: depthData.map(d => d.name),
        axisLabel: {
          color: colors.textMuted,
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: colors.border,
          },
        },
      },
      yAxis: {
        type: 'value',
        name: '讨论数量',
        nameTextStyle: {
          color: colors.textMuted,
        },
        axisLabel: {
          color: colors.textMuted,
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: colors.border,
          },
        },
        splitLine: {
          lineStyle: {
            color: colors.splitLine,
            type: 'dashed',
          },
        },
      },
      series: [
        {
          type: 'bar',
          data: depthData.map(d => ({
            value: d.value,
            percentage: d.percentage,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#60a5fa' },
                { offset: 1, color: '#3b82f6' },
              ]),
            },
          })),
          barWidth: '60%',
          label: {
            show: true,
            position: 'top',
            color: colors.text,
            fontSize: 12,
            formatter: (params: any) => {
              return `${params.value}`;
            },
          },
        },
      ],
    };
  }, [data, title, colors]);

  // 初始化和更新图表
  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    if (Object.keys(chartOption).length > 0) {
      chartInstance.current.setOption(chartOption);
    }

    // 响应式调整
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chartOption]);

  // 清理
  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  // 切换热门讨论展开/折叠
  const toggleHotspot = (rootCommentId: string) => {
    const newExpanded = new Set(expandedHotspots);
    if (newExpanded.has(rootCommentId)) {
      newExpanded.delete(rootCommentId);
    } else {
      newExpanded.add(rootCommentId);
    }
    setExpandedHotspots(newExpanded);
  };

  // 处理点击事件
  const handleHotspotClick = (hotspot: { rootCommentId: string; replyCount: number }) => {
    toggleHotspot(hotspot.rootCommentId);
    onClick?.(hotspot);
  };

  // 渲染统计信息
  const renderStats = () => {
    if (!data) return null;

    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg p-4">
          <div className="text-muted-foreground text-sm mb-1">平均讨论深度</div>
          <div className="text-2xl font-bold text-yellow-400">
            {data.avgThreadDepth.toFixed(2)}
          </div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="text-muted-foreground text-sm mb-1">最大讨论深度</div>
          <div className="text-2xl font-bold text-blue-400">
            {data.maxThreadDepth}
          </div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="text-muted-foreground text-sm mb-1">回复率</div>
          <div className="text-2xl font-bold text-green-400">
            {(data.replyRatio * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="text-muted-foreground text-sm mb-1">总评论数</div>
          <div className="text-2xl font-bold text-purple-400">
            {data.totalRootComments + data.totalReplies}
          </div>
        </div>
      </div>
    );
  };

  // 渲染热门讨论
  const renderHotspots = () => {
    if (!data || data.discussionHotspots.length === 0) return null;

    return (
      <div className="mt-6">
        <h3 className="text-lg font-bold text-foreground mb-4">热门讨论</h3>
        <div className="space-y-2">
          {data.discussionHotspots.map((hotspot) => (
            <div
              key={hotspot.rootCommentId}
              className="bg-card rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleHotspotClick(hotspot)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-sm text-foreground mb-2">
                    {hotspot.rootCommentText}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>回复数: <span className="text-yellow-400">{hotspot.replyCount}</span></span>
                    <span>最大深度: <span className="text-blue-400">{hotspot.maxDepth}</span></span>
                    <span>参与者: <span className="text-green-400">{hotspot.participants}</span></span>
                  </div>
                </div>
                <button
                  className={`text-muted-foreground hover:text-foreground transition-transform ${
                    expandedHotspots.has(hotspot.rootCommentId) ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      <ChartState
        loading={isLoading}
        error={error?.message}
        empty={!data || data.depthDistribution.length === 0}
      >
        {renderStats()}
        <div ref={chartRef} style={{ height: `${height}px` }} />
        {renderHotspots()}
      </ChartState>
    </div>
  );
};

export { CommentThreadTree };
