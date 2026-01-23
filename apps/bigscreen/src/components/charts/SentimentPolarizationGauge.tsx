import React, { useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import * as echarts from 'echarts';

interface SentimentPolarizationData {
  polarizationIndex: number;
  bimodalityCoefficient: number;
  extremeRatio: number;
  neutralRatio: number;
  sentimentVariance: number;
  sentimentStdDev: number;
  distribution: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  };
  polarizationLevel: string;
  polarizationColor: string;
}

interface SentimentPolarizationGaugeProps {
  title?: string;
  height?: number;
  className?: string;
  data?: SentimentPolarizationData | null;
}

/**
 * 情感极化仪表盘组件
 *
 * 展示舆论的分裂程度，包括：
 * - 极化指数仪表盘
 * - 极化等级标识
 * - 关键指标卡片
 */
const SentimentPolarizationGauge: React.FC<SentimentPolarizationGaugeProps> = ({
  title = '情感极化指数',
  height = 400,
  className,
  data,
}) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<echarts.ECharts | null>(null);

  // 仪表盘配置
  const gaugeOption = useMemo(() => {
    if (!data) return {};

    const { polarizationIndex, polarizationColor, polarizationLevel } = data;

    return {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 1,
          splitNumber: 10,
          axisLine: {
            lineStyle: {
              width: 20,
              color: [
                [0.2, '#22c55e'], // 绿色 - 无明显极化
                [0.4, '#84cc16'], // 浅绿 - 轻度极化
                [0.6, '#eab308'], // 黄色 - 中度极化
                [0.8, '#f97316'], // 橙色 - 高度极化
                [1, '#dc2626'],   // 红色 - 严重极化
              ],
            },
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '12%',
            width: 20,
            offsetCenter: [0, '-60%'],
            itemStyle: {
              color: 'auto',
            },
          },
          axisTick: {
            length: 12,
            lineStyle: {
              color: 'auto',
              width: 2,
            },
          },
          splitLine: {
            length: 20,
            lineStyle: {
              color: 'auto',
              width: 5,
            },
          },
          axisLabel: {
            color: '#464646',
            fontSize: 12,
            distance: -60,
            formatter: (value: number) => {
              if (value === 0) return '0';
              if (value === 0.2) return '0.2';
              if (value === 0.4) return '0.4';
              if (value === 0.6) return '0.6';
              if (value === 0.8) return '0.8';
              if (value === 1) return '1';
              return '';
            },
          },
          title: {
            offsetCenter: [0, '-20%'],
            fontSize: 20,
            color: polarizationColor,
            fontWeight: 'bold',
          },
          detail: {
            fontSize: 40,
            offsetCenter: [0, '0%'],
            valueAnimation: true,
            formatter: (value: number) => value.toFixed(2),
            color: polarizationColor,
            fontWeight: 'bold',
          },
          data: [
            {
              value: polarizationIndex,
              name: polarizationLevel,
            },
          ],
        },
      ],
    };
  }, [data]);

  // 初始化图表
  React.useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    if (data && Object.keys(gaugeOption).length > 0) {
      chartInstance.current.setOption(gaugeOption);
    }

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [gaugeOption, data]);

  // 清理图表实例
  React.useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  if (!data) {
    return (
      <div className={cn('w-full h-full', className)} style={{ minHeight: height }}>
        <ChartState
          loading={false}
          error={null}
          empty={true}
          loadingText="加载极化数据..."
          emptyText="暂无极化数据"
        >
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-500">暂无情感极化数据</p>
          </div>
        </ChartState>
      </div>
    );
  }

  return (
    <div className={cn('w-full h-full flex flex-col', className)} style={{ minHeight: height }}>
      {title && (
        <h3 className="text-foreground mb-4 font-semibold text-lg">{title}</h3>
      )}

      <div className="flex-1 flex gap-4">
        {/* 左侧：仪表盘 */}
        <div className="flex-1 min-h-0">
          <div ref={chartRef} className="w-full h-full" />
        </div>

        {/* 右侧：指标卡片 */}
        <div className="w-64 flex flex-col gap-3 overflow-y-auto">
          {/* 极化指数卡片 */}
          <div
            className="p-3 rounded-lg border-l-4"
            style={{ borderColor: data.polarizationColor, backgroundColor: `${data.polarizationColor}10` }}
          >
            <div className="text-xs text-gray-500 mb-1">极化指数</div>
            <div className="text-2xl font-bold" style={{ color: data.polarizationColor }}>
              {data.polarizationIndex.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 mt-1">{data.polarizationLevel}</div>
          </div>

          {/* 双峰系数卡片 */}
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">双峰系数</div>
            <div className="text-xl font-bold text-gray-800">
              {data.bimodalityCoefficient.toFixed(3)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {data.bimodalityCoefficient > 0.7 ? '明显双峰' : '单峰或多峰'}
            </div>
          </div>

          {/* 极端情感占比卡片 */}
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="text-xs text-gray-500 mb-1">极端情感占比</div>
            <div className="text-xl font-bold text-orange-600">
              {(data.extremeRatio * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">
              正面 {(data.distribution.positive / data.distribution.total * 100).toFixed(1)}% + 负面 {(data.distribution.negative / data.distribution.total * 100).toFixed(1)}%
            </div>
          </div>

          {/* 情感方差卡片 */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="text-xs text-gray-500 mb-1">情感方差</div>
            <div className="text-xl font-bold text-blue-600">
              {data.sentimentVariance.toFixed(3)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              标准差: {data.sentimentStdDev.toFixed(3)}
            </div>
          </div>

          {/* 情感分布卡片 */}
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <div className="text-xs text-gray-500 mb-1">情感分布</div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">
                正面: {data.distribution.positive}
              </span>
              <span className="text-red-600">
                负面: {data.distribution.negative}
              </span>
              <span className="text-gray-600">
                中性: {data.distribution.neutral}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              总计: {data.distribution.total}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SentimentPolarizationGauge);
