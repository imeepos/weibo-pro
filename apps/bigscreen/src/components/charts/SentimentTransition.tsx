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

  // Sankey图要求是DAG（有向无环图），不能有循环
  // 使用 _from 和 _to 后缀区分源节点和目标节点，确保单向流动
  // 注意：不包含自环（如 Positive -> Positive），因为自环在Sankey图中会导致循环错误

  const links = [
    // 从 Positive 流向其他节点
    { source: 'Positive (from)', target: 'Negative (to)', value: matrix.positiveToNegative },
    { source: 'Positive (from)', target: 'Neutral (to)', value: matrix.positiveToNeutral },
    // 从 Negative 流向其他节点
    { source: 'Negative (from)', target: 'Positive (to)', value: matrix.negativeToPositive },
    { source: 'Negative (from)', target: 'Neutral (to)', value: matrix.negativeToNeutral },
    // 从 Neutral 流向其他节点
    { source: 'Neutral (from)', target: 'Positive (to)', value: matrix.neutralToPositive },
    { source: 'Neutral (from)', target: 'Negative (to)', value: matrix.neutralToNegative },
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
        text: 'Sentiment Transition Flow',
        subtext: 'No transitions detected',
        left: 'center',
        top: 'center',
      },
    });
    return;
  }

  const option = {
    title: {
      text: 'Sentiment Transition Flow',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: { data: { source?: string; target?: string; value?: number }; name?: string }) => {
        if (params.data.source && params.data.target) {
          const from = params.data.source.replace(' (from)', '');
          const to = params.data.target.replace(' (to)', '');
          return `${from} → ${to}: ${params.data.value}`;
        }
        return params.name?.replace(' (from)', '').replace(' (to)', '') || '';
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
          formatter: (params: { name: string }) => {
            return params.name.replace(' (from)', '').replace(' (to)', '');
          },
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
