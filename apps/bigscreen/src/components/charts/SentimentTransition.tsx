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

  // 使用节点名称而不是索引，确保 ECharts 正确解析
  const nodes = ['Positive', 'Negative', 'Neutral'];
  const links = [
    // 排除自环（source === target），避免 ECharts 检测到循环
    { source: 'Positive', target: 'Negative', value: matrix.positiveToNegative },
    { source: 'Positive', target: 'Neutral', value: matrix.positiveToNeutral },
    { source: 'Negative', target: 'Positive', value: matrix.negativeToPositive },
    { source: 'Negative', target: 'Neutral', value: matrix.negativeToNeutral },
    { source: 'Neutral', target: 'Positive', value: matrix.neutralToPositive },
    { source: 'Neutral', target: 'Negative', value: matrix.neutralToNegative },
  ];

  const option = {
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency',
        },
        data: nodes.map((name) => ({ name })),
        links: links.filter((link) => link.value > 0),
        top: '20%',
        right: '10%',
        bottom: '20%',
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
