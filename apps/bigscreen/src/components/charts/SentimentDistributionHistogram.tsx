import React, { useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import * as echarts from 'echarts';

interface SentimentDistributionData {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

interface SentimentDistributionHistogramProps {
  title?: string;
  height?: number;
  className?: string;
  data?: SentimentDistributionData | null;
}

/**
 * 情感分布直方图组件
 *
 * 展示正面、负面、中性情感的分布情况
 */
const SentimentDistributionHistogram: React.FC<SentimentDistributionHistogramProps> = ({
  title = '情感分布直方图',
  height = 300,
  className,
  data,
}) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<echarts.ECharts | null>(null);

  const chartData = useMemo(() => {
    if (!data || data.total === 0) return [];

    return [
      {
        name: '正面',
        value: data.positive,
        percentage: (data.positive / data.total) * 100,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#10b981' },
            { offset: 1, color: '#059669' },
          ]),
        },
      },
      {
        name: '负面',
        value: data.negative,
        percentage: (data.negative / data.total) * 100,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#ef4444' },
            { offset: 1, color: '#dc2626' },
          ]),
        },
      },
      {
        name: '中性',
        value: data.neutral,
        percentage: (data.neutral / data.total) * 100,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#6b7280' },
            { offset: 1, color: '#4b5563' },
          ]),
        },
      },
    ];
  }, [data]);

  const option = useMemo(() => {
    if (chartData.length === 0) return {};

    const maxValue = Math.max(...chartData.map((d) => d.value));

    return {
      grid: {
        left: '5%',
        right: '5%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const param = params[0];
          const dataItem = chartData[param.dataIndex];
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${param.name}</div>
              <div>数量: <span style="font-weight: bold;">${param.value}</span></div>
              <div>占比: <span style="font-weight: bold;">${dataItem.percentage.toFixed(1)}%</span></div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: chartData.map((d) => d.name),
        axisLine: { lineStyle: { color: '#6b7280' } },
        axisLabel: {
          color: '#9ca3af',
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      yAxis: {
        type: 'value',
        name: '数量',
        nameLocation: 'middle',
        nameGap: 40,
        axisLine: { lineStyle: { color: '#6b7280' } },
        axisLabel: { color: '#9ca3af' },
        splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: chartData.map((d) => ({
            value: d.value,
            itemStyle: d.itemStyle,
          })),
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            color: '#9ca3af',
            formatter: (params: any) => {
              const dataItem = chartData[params.dataIndex];
              return `${params.value}\n(${dataItem.percentage.toFixed(1)}%)`;
            },
            fontSize: 12,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }, [chartData]);

  React.useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    if (Object.keys(option).length > 0) {
      chartInstance.current.setOption(option);
    }

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [option]);

  React.useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  return (
    <div className={cn('w-full h-full', className)} style={{ minHeight: height }}>
      <ChartState
        loading={false}
        error={null}
        empty={!data || data.total === 0}
        loadingText="加载情感分布数据..."
        emptyText="暂无情感分布数据"
      >
        <div className="w-full h-full flex flex-col">
          {title && (
            <h3 className="text-foreground mb-4 font-semibold">{title}</h3>
          )}
          <div ref={chartRef} className="flex-1 min-h-0" />
        </div>
      </ChartState>
    </div>
  );
};

export default React.memo(SentimentDistributionHistogram);
