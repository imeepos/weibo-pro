import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { MediaTypeAnalysis } from '@sker/sdk';

interface MediaTypeDistributionProps {
  title?: string;
  height?: number;
  className?: string;
  data?: MediaTypeAnalysis | null;
  isLoading?: boolean;
  error?: Error | null;
}

// 媒体类型名称映射
const MEDIA_TYPE_NAMES: Record<string, string> = {
  text: '纯文本',
  image: '图片',
  video: '视频',
  link: '链接',
  mixed: '混合',
};

// 媒体类型颜色映射
const MEDIA_TYPE_COLORS = [
  'rgba(96, 165, 250, 0.8)',   // 蓝色 - text
  'rgba(52, 211, 153, 0.8)',   // 绿色 - image
  'rgba(251, 191, 36, 0.8)',   // 金色 - video
  'rgba(156, 163, 175, 0.8)',  // 灰色 - link
  'rgba(244, 114, 182, 0.8)',  // 粉色 - mixed
];

const MediaTypeDistribution: React.FC<MediaTypeDistributionProps> = ({
  title = '媒体类型分布',
  height = 400,
  className,
  data,
  isLoading = false,
  error = null,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 构建 ECharts pie 配置
  const chartOption = useMemo<EChartsOption>(() => {
    if (!data || data.distribution.length === 0) return {};

    const { distribution, totalPosts } = data;

    // 构建饼图数据
    const pieData = distribution.map((item) => ({
      name: `${MEDIA_TYPE_NAMES[item.type]} (${item.percentage.toFixed(1)}%)`,
      value: item.count,
      percentage: item.percentage,
      avgEngagement: item.avgEngagement,
    }));

    return {
      title: {
        text: `${title}\n总帖子数: ${totalPosts}`,
        left: 'center',
        top: '5%',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#ffffff',
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data;
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
              <div>帖子数: ${data.value}</div>
              <div>占比: ${data.percentage.toFixed(1)}%</div>
              <div>平均互动: ${data.avgEngagement.toFixed(1)}</div>
            </div>
          `;
        },
      },
      legend: {
        orient: 'vertical',
        right: '10%',
        top: 'center',
        textStyle: {
          color: '#ffffff',
          fontSize: 12,
        },
        data: distribution.map(item => MEDIA_TYPE_NAMES[item.type]),
      },
      color: MEDIA_TYPE_COLORS,
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'], // 环形图
          center: ['35%', '55%'],
          data: pieData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
        },
      ],
    };
  }, [data, title]);

  // 初始化和更新图表
  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // 设置配置
    if (Object.keys(chartOption).length > 0) {
      chartInstance.current.setOption(chartOption, true);
    }

    // 响应式
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chartOption]);

  // 组件卸载时销毁图表
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  const isEmpty = !data || data.distribution.length === 0;

  return (
    <ChartState
      isLoading={isLoading}
      error={error}
      empty={isEmpty}
      emptyText="暂无媒体类型数据"
    >
      <div
        ref={chartRef}
        className={cn('w-full', className)}
        style={{ height: `${height}px` }}
      />
    </ChartState>
  );
};

export default MediaTypeDistribution;
