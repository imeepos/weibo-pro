import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { useSentimentTransition } from '../../hooks/useSentimentTransition';
import { useEChartTheme } from '@sker/ui/hooks/use-echart-theme';
import type { SentimentTransitionAnalysis } from '@sker/sdk';
import './SentimentTransition.css';

interface SentimentTransitionProps {
  eventId: string;
}

export const SentimentTransition: React.FC<SentimentTransitionProps> = ({ eventId }) => {
  const { data, loading, error } = useSentimentTransition(eventId);
  const sankeyRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
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

  if (loading) {
    return <div className="sentiment-transition loading">加载中...</div>;
  }

  if (error) {
    return <div className="sentiment-transition error">错误: {error.message}</div>;
  }

  if (!data || data.timeline.length === 0) {
    return <div className="sentiment-transition empty">暂无数据</div>;
  }

  return (
    <div className="sentiment-transition">
      <div className="sentiment-transition-header">
        <h3>情感转变分析</h3>
        <div className="metrics">
          <div className="metric">
            <span className="label">稳定性指数:</span>
            <span className="value">{formatNumber(Math.round(data.stabilityIndex * 100))}%</span>
          </div>
          <div className="metric">
            <span className="label">极化指数:</span>
            <span className="value">{formatNumber(Math.round(data.polarizationIndex * 100))}%</span>
          </div>
        </div>
      </div>

      <div className="sentiment-transition-body">
        <div className="chart-container">
          <h4>转变流向桑基图</h4>
          <div ref={sankeyRef} className="sankey-chart" style={{ width: '100%', height: '400px' }}></div>
        </div>

        <div className="chart-container">
          <h4>情感时间线</h4>
          <div ref={timelineRef} className="timeline-chart" style={{ width: '100%', height: '400px' }}></div>
        </div>
      </div>

      {data.turningPoints.length > 0 && (
        <div className="turning-points">
          <h4>转折点</h4>
          <ul>
            {data.turningPoints.map((point, index) => {
              const timestamp = point.timestamp instanceof Date
                ? point.timestamp
                : String(point.timestamp);
              return (
                <li key={index} className="turning-point-item">
                  <div className="turning-point-header">
                    <span className="timestamp">{formatTime(timestamp)}</span>
                    {point.confidence !== undefined && (
                      <span className="confidence">
                        置信度: {Math.round(point.confidence * 100)}%
                      </span>
                    )}
                  </div>

                  <div className="turning-point-body">
                    <div className="sentiment-change">
                      <span className={`sentiment from-${point.fromSentiment}`}>
                        {point.fromSentiment}
                      </span>
                      <span className="arrow">→</span>
                      <span className={`sentiment to-${point.toSentiment}`}>
                        {point.toSentiment}
                      </span>
                      <span className="magnitude">
                        变化率: {Math.round(point.magnitude * 100)}%
                      </span>
                    </div>

                    {/* 显示情感分布 */}
                    {point.sentimentDistribution && (
                      <div className="sentiment-distribution">
                        <div className="distribution-column">
                          <h5>转折前</h5>
                          <div className="distribution-values">
                            <div className="value-item positive">
                              <span className="label">正面:</span>
                              <span className="value">{formatNumber(Math.round(point.sentimentDistribution.before.positive))}</span>
                            </div>
                            <div className="value-item negative">
                              <span className="label">负面:</span>
                              <span className="value">{formatNumber(Math.round(point.sentimentDistribution.before.negative))}</span>
                            </div>
                            <div className="value-item neutral">
                              <span className="label">中性:</span>
                              <span className="value">{formatNumber(Math.round(point.sentimentDistribution.before.neutral))}</span>
                            </div>
                          </div>
                        </div>
                        <div className="distribution-column">
                          <h5>转折后</h5>
                          <div className="distribution-values">
                            <div className="value-item positive">
                              <span className="label">正面:</span>
                              <span className="value">{formatNumber(Math.round(point.sentimentDistribution.after.positive))}</span>
                            </div>
                            <div className="value-item negative">
                              <span className="label">负面:</span>
                              <span className="value">{formatNumber(Math.round(point.sentimentDistribution.after.negative))}</span>
                            </div>
                            <div className="value-item neutral">
                              <span className="label">中性:</span>
                              <span className="value">{formatNumber(Math.round(point.sentimentDistribution.after.neutral))}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 显示关键词 */}
                    {point.triggerKeywords && point.triggerKeywords.length > 0 && (
                      <div className="trigger-keywords">
                        <h5>关键词</h5>
                        <div className="keywords">
                          {point.triggerKeywords.map((keyword, i) => (
                            <span key={i} className="keyword-tag">{keyword}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 显示触发帖子 */}
                    {point.triggerPosts && point.triggerPosts.length > 0 && (
                      <div className="trigger-posts">
                        <h5>触发帖子</h5>
                        <ul className="post-list">
                          {point.triggerPosts.map((postId, i) => (
                            <li key={i}>
                              <a href={`/posts/${postId}`} target="_blank" rel="noopener noreferrer">
                                查看帖子 {postId.substring(0, 8)}...
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 显示元数据 */}
      {data.metadata && (
        <div className="analysis-metadata">
          <h4>分析统计</h4>
          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="label">总时间点:</span>
              <span className="value">{data.metadata.totalTimePoints}</span>
            </div>
            <div className="metadata-item">
              <span className="label">分析时间点:</span>
              <span className="value">{data.metadata.analyzedTimePoints}</span>
            </div>
            <div className="metadata-item">
              <span className="label">跳过边界点:</span>
              <span className="value">{data.metadata.skippedBoundaryPoints}</span>
            </div>
            <div className="metadata-item">
              <span className="label">计算方法:</span>
              <span className="value">{data.metadata.calculationMethod}</span>
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

function renderTimelineChart(
  data: SentimentTransitionAnalysis,
  container: HTMLElement,
  colors: ReturnType<typeof useEChartTheme>['colors']
) {
  const chart = echarts.init(container);

  // 格式化时间戳
  const timestamps = data.timeline.map((t) => {
    const date = t.timestamp instanceof Date ? t.timestamp : new Date(t.timestamp);
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
