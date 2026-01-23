import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { useSentimentTransition } from '../../hooks/useSentimentTransition';
import { useEChartTheme } from '@sker/ui/hooks/use-echart-theme';
import type { SentimentTransitionAnalysis } from '@sker/sdk';

interface SentimentTransitionProps {
  eventId: string;
}

export const SentimentTransition: React.FC<SentimentTransitionProps> = ({ eventId }) => {
  const { data, loading, error } = useSentimentTransition(eventId);
  const sankeyRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const turningPointsRef = useRef<HTMLDivElement>(null);
  const { colors } = useEChartTheme();

  // 格式化数字（添加千分位分隔符）
  const formatNumber = (num: number): string => {
    return num.toLocaleString('zh-CN');
  };

  // 格式化时间
  const formatTime = (timestamp: string | Date): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    if (data && sankeyRef.current) {
      renderSankeyChart(data, sankeyRef.current, colors);
    }
  }, [data, colors]);

  useEffect(() => {
    if (data && timelineRef.current) {
      renderTimelineChart(data, timelineRef.current, colors);
    }
  }, [data, colors]);

  useEffect(() => {
    if (data && turningPointsRef.current && data.turningPoints.length > 0) {
      renderTurningPointsTimeline(data, turningPointsRef.current, colors);
    }
  }, [data, colors]);

  if (loading) {
    return <div className="p-10 text-center text-muted-foreground">加载中...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-destructive">错误: {error.message}</div>;
  }

  if (!data || data.timeline.length === 0) {
    return <div className="p-10 text-center text-muted-foreground">暂无数据</div>;
  }

  return (
    <div className="p-5 bg-background rounded-lg border border-border">
      <div className="mb-5">
        <h3 className="m-0 mb-2.5 text-xl font-semibold text-foreground">情感转变分析</h3>
        <div className="flex gap-5 flex-wrap">
          <div className="flex gap-2 items-center px-4 py-2 bg-muted rounded-md">
            <span className="font-medium text-muted-foreground">稳定性指数:</span>
            <span className="text-primary font-semibold text-base">{formatNumber(Math.round(data.stabilityIndex * 100))}%</span>
          </div>
          <div className="flex gap-2 items-center px-4 py-2 bg-muted rounded-md">
            <span className="font-medium text-muted-foreground">极化指数:</span>
            <span className="text-primary font-semibold text-base">{formatNumber(Math.round(data.polarizationIndex * 100))}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="border border-border rounded-lg p-4 bg-card">
          <h4 className="m-0 mb-3 text-sm font-semibold text-foreground">转变流向桑基图</h4>
          <div ref={sankeyRef} className="w-full h-[400px]"></div>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card">
          <h4 className="m-0 mb-3 text-sm font-semibold text-foreground">情感时间线</h4>
          <div ref={timelineRef} className="w-full h-[400px]"></div>
        </div>
      </div>

      {data.turningPoints.length > 0 && (
        <div className="mt-5 p-4 bg-card border border-border rounded-lg">
          <h4 className="m-0 mb-3 text-base font-semibold text-foreground">转折点时间轴</h4>
          <div ref={turningPointsRef} className="w-full h-[300px]"></div>
        </div>
      )}

      {/* 显示元数据 */}
      {data.metadata && (
        <div className="mt-5 p-4 bg-card border border-border rounded-lg">
          <h4 className="m-0 mb-3 text-base font-semibold text-foreground">分析统计</h4>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            <div className="flex justify-between items-center px-3.5 py-2.5 bg-muted rounded-md">
              <span className="text-[13px] text-muted-foreground font-medium">总时间点:</span>
              <span className="text-sm text-foreground font-semibold">{formatNumber(data.metadata.totalTimePoints)}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2.5 bg-muted rounded-md">
              <span className="text-[13px] text-muted-foreground font-medium">分析时间点:</span>
              <span className="text-sm text-foreground font-semibold">{formatNumber(data.metadata.analyzedTimePoints)}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2.5 bg-muted rounded-md">
              <span className="text-[13px] text-muted-foreground font-medium">跳过边界点:</span>
              <span className="text-sm text-foreground font-semibold">{formatNumber(data.metadata.skippedBoundaryPoints)}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2.5 bg-muted rounded-md">
              <span className="text-[13px] text-muted-foreground font-medium">计算方法:</span>
              <span className="text-sm text-foreground font-semibold">{data.metadata.calculationMethod}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function renderSankeyChart(
  data: SentimentTransitionAnalysis,
  container: HTMLElement,
  colors: ReturnType<typeof useEChartTheme>['colors']
) {
  const chart = echarts.init(container);
  const matrix = data.transitionMatrix;

  // Sankey图要求是DAG（有向无环图），不能有循环
  // 使用 _from 和 _to 后缀区分源节点和目标节点，确保单向流动
  // 注意：不包含自环（如 Positive -> Positive），因为自环在Sankey图中会导致循环错误

  const links = [
    // 从正面流向其他节点
    { source: '正面（源）', target: '负面（目标）', value: matrix.positiveToNegative },
    { source: '正面（源）', target: '中性（目标）', value: matrix.positiveToNeutral },
    // 从负面流向其他节点
    { source: '负面（源）', target: '正面（目标）', value: matrix.negativeToPositive },
    { source: '负面（源）', target: '中性（目标）', value: matrix.negativeToNeutral },
    // 从中性流向其他节点
    { source: '中性（源）', target: '正面（目标）', value: matrix.neutralToPositive },
    { source: '中性（源）', target: '负面（目标）', value: matrix.neutralToNegative },
  ];

  // 过滤掉值为 0 的连接
  const validLinks = links.filter((link) => link.value > 0);

  // 根据有效链接动态生成节点
  const nodeSet = new Set<string>();
  validLinks.forEach((link) => {
    nodeSet.add(link.source);
    nodeSet.add(link.target);
  });

  const nodes = Array.from(nodeSet).map((name) => ({ name }));

  // 如果没有有效的转换数据，显示空状态
  if (validLinks.length === 0) {
    chart.setOption({
      title: {
        text: '情感转变流向',
        subtext: '未检测到转变',
        left: 'center',
        top: 'center',
        textStyle: {
          color: colors.text,
        },
        subtextStyle: {
          color: colors.textMuted,
        },
      },
    });
    return;
  }

  const option = {
    title: {
      text: '情感转变流向',
      left: 'center',
      textStyle: {
        color: colors.text,
        fontSize: 14,
      },
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: {
        color: colors.text,
      },
      formatter: (params: { data: { source?: string; target?: string; value?: number }; name?: string }) => {
        if (params.data.source && params.data.target) {
          const from = params.data.source.replace('（源）', '');
          const to = params.data.target.replace('（目标）', '');
          const value = params.data.value?.toLocaleString('zh-CN') || 0;
          return `${from} → ${to}: ${value}`;
        }
        return params.name?.replace('（源）', '').replace('（目标）', '') || '';
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency',
        },
        data: nodes,
        links: validLinks,
        top: '10%',
        right: '10%',
        bottom: '10%',
        left: '10%',
        nodeWidth: 20,
        nodeGap: 8,
        label: {
          fontSize: 12,
          color: colors.text,
          formatter: (params: { name: string }) => {
            return params.name.replace('（源）', '').replace('（目标）', '');
          },
        },
        lineStyle: {
          curveness: 0.5,
          opacity: 0.5,
        },
      },
    ],
  };

  chart.setOption(option);

  const resizeObserver = new ResizeObserver(() => {
    chart.resize();
  });
  resizeObserver.observe(container);
}

function renderTurningPointsTimeline(
  data: SentimentTransitionAnalysis,
  container: HTMLElement,
  colors: ReturnType<typeof useEChartTheme>['colors']
) {
  const chart = echarts.init(container);

  // 使用更柔和、专业的配色方案，支持主题适配
  const getSentimentColor = (sentiment: string, opacity = 1) => {
    const colorMap: Record<string, { base: string; light: string }> = {
      positive: { base: `rgba(34, 197, 94, ${opacity})`, light: 'rgba(34, 197, 94, 0.15)' },
      negative: { base: `rgba(239, 68, 68, ${opacity})`, light: 'rgba(239, 68, 68, 0.15)' },
      neutral: { base: `rgba(156, 163, 175, ${opacity})`, light: 'rgba(156, 163, 175, 0.15)' },
    };
    return colorMap[sentiment] || { base: `rgba(156, 163, 175, ${opacity})`, light: 'rgba(156, 163, 175, 0.15)' };
  };

  const sentimentLabels: Record<string, string> = {
    positive: '正面',
    negative: '负面',
    neutral: '中性',
  };

  // 准备时间轴数据
  const timelineData = data.turningPoints.map((point, index) => {
    const date = new Date(point.timestamp);
    const timeStr = date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const toColor = getSentimentColor(point.toSentiment);

    return {
      name: timeStr,
      value: [index, point.magnitude * 100],
      itemStyle: {
        color: toColor.base,
        borderColor: toColor.base.replace(/[\d.]+\)$/, '0.8)'),
        borderWidth: 2,
        shadowBlur: 8,
        shadowColor: toColor.light,
      },
      fromSentiment: point.fromSentiment,
      toSentiment: point.toSentiment,
      magnitude: point.magnitude,
      confidence: point.confidence,
      timestamp: point.timestamp,
    };
  });

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      borderRadius: 8,
      padding: [12, 16],
      textStyle: {
        color: colors.text,
        fontSize: 12,
      },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);',
      formatter: (params: any) => {
        const d = params.data;
        const from = sentimentLabels[d.fromSentiment] || d.fromSentiment;
        const to = sentimentLabels[d.toSentiment] || d.toSentiment;
        const fromColor = getSentimentColor(d.fromSentiment).base;
        const toColor = getSentimentColor(d.toSentiment).base;
        const date = new Date(d.timestamp);
        const timeStr = date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        let html = `<div style="font-weight:600;margin-bottom:10px;font-size:13px">${timeStr}</div>`;
        html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;padding:6px 10px;background:rgba(0,0,0,0.05);border-radius:6px">`;
        html += `<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:${fromColor}"></span>${from}</span>`;
        html += `<span style="color:${colors.textMuted}">→</span>`;
        html += `<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:${toColor}"></span>${to}</span>`;
        html += `</div>`;
        html += `<div style="display:flex;justify-content:space-between;gap:16px;font-size:12px">`;
        html += `<span style="color:${colors.textMuted}">幅度</span><span style="font-weight:500">${Math.round(d.magnitude * 100)}%</span>`;
        html += `</div>`;
        if (d.confidence !== undefined) {
          html += `<div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;margin-top:4px">`;
          html += `<span style="color:${colors.textMuted}">置信度</span><span style="font-weight:500">${Math.round(d.confidence * 100)}%</span>`;
          html += `</div>`;
        }
        return html;
      },
    },
    grid: {
      left: '3%',
      right: '3%',
      top: '18%',
      bottom: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: timelineData.map((d) => d.name),
      axisLine: {
        show: true,
        lineStyle: {
          color: colors.border,
          width: 1,
        },
      },
      axisLabel: {
        color: colors.textMuted,
        rotate: 0,
        fontSize: 11,
        margin: 12,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      name: '转变幅度',
      nameTextStyle: {
        color: colors.textMuted,
        fontSize: 11,
        padding: [0, 0, 8, 0],
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: colors.textMuted,
        fontSize: 11,
        formatter: '{value}%',
      },
      splitLine: {
        lineStyle: {
          color: colors.splitLine,
          type: 'dashed',
          opacity: 0.6,
        },
      },
    },
    series: [
      {
        type: 'line',
        data: timelineData.map((d) => d.value[1]),
        smooth: 0.3,
        showSymbol: false,
        lineStyle: {
          color: colors.border,
          width: 1.5,
          type: 'dashed',
          opacity: 0.5,
        },
        z: 0,
      },
      {
        type: 'scatter',
        symbolSize: (val: number[]) => {
          // 更小、更精致的圆点，基于幅度动态调整
          const base = 10;
          const scale = Math.min(val[1] / 100, 1) * 6;
          return base + scale;
        },
        data: timelineData,
        label: {
          show: true,
          position: 'top',
          distance: 8,
          formatter: (params: any) => {
            const d = params.data;
            const from = sentimentLabels[d.fromSentiment]?.[0] || '?';
            const to = sentimentLabels[d.toSentiment]?.[0] || '?';
            return `{from|${from}}{arrow|→}{to|${to}}`;
          },
          rich: {
            from: {
              fontSize: 10,
              color: colors.textMuted,
              padding: [0, 2, 0, 0],
            },
            arrow: {
              fontSize: 10,
              color: colors.textMuted,
              padding: [0, 2],
            },
            to: {
              fontSize: 10,
              fontWeight: 500,
              color: colors.text,
              padding: [0, 0, 0, 2],
            },
          },
        },
        emphasis: {
          scale: 1.3,
          itemStyle: {
            shadowBlur: 12,
          },
        },
        z: 1,
      },
    ],
  };

  chart.setOption(option);

  const resizeObserver = new ResizeObserver(() => {
    chart.resize();
  });
  resizeObserver.observe(container);
}

function renderTimelineChart(
  data: SentimentTransitionAnalysis,
  container: HTMLElement,
  colors: ReturnType<typeof useEChartTheme>['colors']
) {
  const chart = echarts.init(container);

  // 格式化时间戳
  const timestamps = data.timeline.map((t) => {
    const date = new Date(t.timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  });
  const positive = data.timeline.map((t) => t.positive);
  const negative = data.timeline.map((t) => t.negative);
  const neutral = data.timeline.map((t) => t.neutral);

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: {
        color: colors.text,
      },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return '';
        const time = params[0]?.axisValue || '';
        let result = `${time}<br/>`;
        params.forEach((param: any) => {
          const value = param.value?.toLocaleString('zh-CN') || 0;
          result += `${param.marker}${param.seriesName}: ${value}<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ['正面', '负面', '中性'],
      textStyle: {
        color: colors.text,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: timestamps,
      axisLine: {
        lineStyle: {
          color: colors.border,
        },
      },
      axisLabel: {
        color: colors.textMuted,
        rotate: 45,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: colors.border,
        },
      },
      axisLabel: {
        color: colors.textMuted,
        formatter: (value: number) => value.toLocaleString('zh-CN'),
      },
      splitLine: {
        lineStyle: {
          color: colors.splitLine,
        },
      },
    },
    series: [
      {
        name: '正面',
        type: 'line',
        data: positive,
        smooth: true,
        itemStyle: { color: '#52c41a' },
        lineStyle: { width: 2 },
        areaStyle: {
          color: 'rgba(82, 196, 26, 0.1)',
        },
      },
      {
        name: '负面',
        type: 'line',
        data: negative,
        smooth: true,
        itemStyle: { color: '#ff4d4f' },
        lineStyle: { width: 2 },
        areaStyle: {
          color: 'rgba(255, 77, 79, 0.1)',
        },
      },
      {
        name: '中性',
        type: 'line',
        data: neutral,
        smooth: true,
        itemStyle: { color: '#faad14' },
        lineStyle: { width: 2 },
        areaStyle: {
          color: 'rgba(250, 173, 20, 0.1)',
        },
      },
    ],
  };

  chart.setOption(option);

  const resizeObserver = new ResizeObserver(() => {
    chart.resize();
  });
  resizeObserver.observe(container);
}
