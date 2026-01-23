import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useSentimentTransition } from '../../hooks/useSentimentTransition';
import type { SentimentTransitionAnalysis } from '@sker/sdk';
import './SentimentTransition.css';

interface SentimentTransitionProps {
  eventId: string;
}

export const SentimentTransition: React.FC<SentimentTransitionProps> = ({ eventId }) => {
  const { data, loading, error } = useSentimentTransition(eventId);
  const sankeyRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data && sankeyRef.current) {
      renderSankeyChart(data, sankeyRef.current);
    }
  }, [data]);

  useEffect(() => {
    if (data && timelineRef.current) {
      renderTimelineChart(data, timelineRef.current);
    }
  }, [data]);

  if (loading) {
    return <div className="sentiment-transition loading">Loading...</div>;
  }

  if (error) {
    return <div className="sentiment-transition error">Error: {error.message}</div>;
  }

  if (!data || data.timeline.length === 0) {
    return <div className="sentiment-transition empty">No data available</div>;
  }

  return (
    <div className="sentiment-transition">
      <div className="sentiment-transition-header">
        <h3>Sentiment Transition Analysis</h3>
        <div className="metrics">
          <div className="metric">
            <span className="label">Stability Index:</span>
            <span className="value">{(data.stabilityIndex * 100).toFixed(1)}%</span>
          </div>
          <div className="metric">
            <span className="label">Polarization Index:</span>
            <span className="value">{(data.polarizationIndex * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="sentiment-transition-body">
        <div className="chart-container">
          <h4>Transition Flow (Sankey)</h4>
          <div ref={sankeyRef} className="sankey-chart" style={{ width: '100%', height: '400px' }}></div>
        </div>

        <div className="chart-container">
          <h4>Sentiment Timeline</h4>
          <div ref={timelineRef} className="timeline-chart" style={{ width: '100%', height: '400px' }}></div>
        </div>
      </div>

      {data.turningPoints.length > 0 && (
        <div className="turning-points">
          <h4>Turning Points</h4>
          <ul>
            {data.turningPoints.map((point, index) => (
              <li key={index}>
                {point.timestamp}: {point.fromSentiment} → {point.toSentiment}
                (magnitude: {point.magnitude.toFixed(2)})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

function renderSankeyChart(data: SentimentTransitionAnalysis, container: HTMLElement) {
  const chart = echarts.init(container);
  const matrix = data.transitionMatrix;

  // 将每个情感状态拆分为源节点和目标节点，避免循环
  // 例如：Positive 作为源只能流向其他节点，Positive_out -> Negative_in
  const sourceNodes = ['Positive_out', 'Negative_out', 'Neutral_out'];
  const targetNodes = ['Positive_in', 'Negative_in', 'Neutral_in'];

  const links = [
    // 从 Positive 流向其他节点
    { source: 'Positive_out', target: 'Negative_in', value: matrix.positiveToNegative },
    { source: 'Positive_out', target: 'Neutral_in', value: matrix.positiveToNeutral },
    // 从 Negative 流向其他节点
    { source: 'Negative_out', target: 'Positive_in', value: matrix.negativeToPositive },
    { source: 'Negative_out', target: 'Neutral_in', value: matrix.negativeToNeutral },
    // 从 Neutral 流向其他节点
    { source: 'Neutral_out', target: 'Positive_in', value: matrix.neutralToPositive },
    { source: 'Neutral_out', target: 'Negative_in', value: matrix.neutralToNegative },
    // 添加自保持连接（状态保持不变）
    { source: 'Positive_out', target: 'Positive_in', value: matrix.positiveToPositive },
    { source: 'Negative_out', target: 'Negative_in', value: matrix.negativeToNegative },
    { source: 'Neutral_out', target: 'Neutral_in', value: matrix.neutralToNeutral },
  ];

  // 过滤掉值为 0 的连接
  const validLinks = links.filter((link) => link.value > 0);

  // 创建节点，包含显示名称
  const nodes = [
    { name: 'Positive', category: 'source' },
    { name: 'Negative', category: 'source' },
    { name: 'Neutral', category: 'source' },
  ];

  const option = {
    title: {
      text: 'Sentiment Transition Flow',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency',
        },
        data: nodes,
        // 过滤掉可能导致循环的边，只保留单向流动
        links: (() => {
          const filteredLinks: typeof links = [];
          const processedPairs = new Set<string>();

          for (const link of validLinks) {
            const source = link.source.replace('_out', '').replace('_in', '');
            const target = link.target.replace('_out', '').replace('_in', '');

            // 保留自环
            if (source === target) {
              filteredLinks.push(link);
              continue;
            }

            // 创建排序后的键，用于检测双向流动
            const pairKey = [source, target].sort().join('-');

            if (processedPairs.has(pairKey)) {
              // 已处理过这对节点，跳过
              continue;
            }

            // 查找反向链接
            const reverseLink = validLinks.find(
              (l) => {
                const revSource = l.source.replace('_out', '').replace('_in', '');
                const revTarget = l.target.replace('_out', '').replace('_in', '');
                return revSource === target && revTarget === source;
              }
            );

            if (reverseLink) {
              // 有双向流动，只保留流量较大的方向
              if (link.value >= reverseLink.value) {
                filteredLinks.push(link);
              }
              processedPairs.add(pairKey);
            } else {
              // 单向流动，保留
              filteredLinks.push(link);
            }
          }

          return filteredLinks.map((link) => ({
            source: link.source.replace('_out', '').replace('_in', ''),
            target: link.target.replace('_out', '').replace('_in', ''),
            value: link.value,
          }));
        })(),
        top: '10%',
        right: '10%',
        bottom: '10%',
        left: '10%',
        nodeWidth: 20,
        nodeGap: 8,
        label: {
          fontSize: 12,
        },
        lineStyle: {
          curveness: 0.5,
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

function renderTimelineChart(data: SentimentTransitionAnalysis, container: HTMLElement) {
  const chart = echarts.init(container);

  const timestamps = data.timeline.map((t) => t.timestamp);
  const positive = data.timeline.map((t) => t.positive);
  const negative = data.timeline.map((t) => t.negative);
  const neutral = data.timeline.map((t) => t.neutral);

  const option = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['Positive', 'Negative', 'Neutral'],
    },
    xAxis: {
      type: 'category',
      data: timestamps,
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: 'Positive',
        type: 'line',
        data: positive,
        smooth: true,
        itemStyle: { color: '#52c41a' },
      },
      {
        name: 'Negative',
        type: 'line',
        data: negative,
        smooth: true,
        itemStyle: { color: '#ff4d4f' },
      },
      {
        name: 'Neutral',
        type: 'line',
        data: neutral,
        smooth: true,
        itemStyle: { color: '#faad14' },
      },
    ],
  };

  chart.setOption(option);

  const resizeObserver = new ResizeObserver(() => {
    chart.resize();
  });
  resizeObserver.observe(container);
}
