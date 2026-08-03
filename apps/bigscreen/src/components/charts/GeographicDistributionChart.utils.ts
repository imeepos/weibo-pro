import type { EChartsOption } from '@sker/ui/components/ui/echart';

export interface GeographicDataItem {
  region: string;
  count: number;      // 用户数
  percentage: number; // 百分比
  posts: number;      // 帖子数
  sentiment: number;  // 情感值 (-1 到 1)
}

// 根据情感值获取颜色 (sentiment 范围: 0-1, 0.5为中性)
export const getSentimentColor = (sentiment: number): string => {
  if (sentiment >= 0.65) return '#22c55e'; // 正面 - 绿色
  if (sentiment >= 0.55) return '#84cc16'; // 轻微正面 - 浅绿
  if (sentiment >= 0.45) return '#eab308'; // 中性 - 黄色
  if (sentiment >= 0.35) return '#f97316'; // 轻微负面 - 橙色
  return '#ef4444'; // 负面 - 红色
};

// 情感标签
export const getSentimentLabel = (sentiment: number): string => {
  if (sentiment >= 0.65) return '正面';
  if (sentiment >= 0.55) return '偏正';
  if (sentiment >= 0.45) return '中性';
  if (sentiment >= 0.35) return '偏负';
  return '负面';
};

// 处理数据，按用户数排序并限制数量
export function sortAndLimitData(data: GeographicDataItem[] | null | undefined, maxItems: number): GeographicDataItem[] {
  if (!data || data.length === 0) return [];
  return [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);
}

export interface GeographicSummary {
  totalUsers: number;
  totalPosts: number;
  avgSentiment: number;
  topRegion: GeographicDataItem;
  regionCount: number;
}

// 构建统计摘要
export function buildGeographicSummary(
  processedData: GeographicDataItem[],
  propTotalPosts?: number,
  propTotalUsers?: number,
  propTotalRegions?: number,
): GeographicSummary | null {
  if (processedData.length === 0) return null;

  // 必须使用 prop 传入的真实统计数据（后端返回），前端累加 top N 数据是不准确的
  const totalUsers = propTotalUsers ?? 0;
  const totalPosts = propTotalPosts ?? 0;
  const regionCount = propTotalRegions ?? 0;

  const localTotalUsers = processedData.reduce((sum, d) => sum + d.count, 0);
  const avgSentiment = processedData.reduce((sum, d) => sum + d.sentiment * d.count, 0) / localTotalUsers;
  const topRegion = processedData[0];
  return { totalUsers, totalPosts, avgSentiment, topRegion, regionCount };
}

// 构建图表配置
export function buildGeographicChartOption(
  processedData: GeographicDataItem[],
  isDark: boolean,
): EChartsOption | null {
  if (processedData.length === 0) return null;

  const regions = processedData.map(d => d.region);
  const userCounts = processedData.map(d => d.count);
  const postCounts = processedData.map(d => d.posts);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      textStyle: { color: isDark ? '#fff' : '#333' },
      formatter: (params: any) => {
        const dataIndex = params[0]?.dataIndex;
        if (dataIndex === undefined) return '';
        const item = processedData[dataIndex];
        if (!item) return '';
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${item.region}</div>
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="display: inline-block; width: 10px; height: 10px; background: #3b82f6; border-radius: 2px; margin-right: 8px;"></span>
              <span>用户数: <b>${item.count}</b> (${item.percentage.toFixed(1)}%)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="display: inline-block; width: 10px; height: 10px; background: #8b5cf6; border-radius: 2px; margin-right: 8px;"></span>
              <span>帖子数: <b>${item.posts}</b></span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="display: inline-block; width: 10px; height: 10px; background: ${getSentimentColor(item.sentiment)}; border-radius: 2px; margin-right: 8px;"></span>
              <span>情感: <b>${getSentimentLabel(item.sentiment)}</b> (${item.sentiment.toFixed(2)})</span>
            </div>
          </div>
        `;
      }
    },
    legend: {
      data: ['用户数', '帖子数'],
      top: 0,
      textStyle: { color: isDark ? '#9ca3af' : '#6b7280' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 40,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
      axisLabel: { color: isDark ? '#9ca3af' : '#6b7280' },
      splitLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: regions,
      axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
      axisLabel: {
        color: isDark ? '#9ca3af' : '#6b7280',
        fontSize: 12,
        formatter: (value: string) => value.length > 6 ? value.slice(0, 6) + '...' : value
      }
    },
    series: [
      {
        name: '用户数',
        type: 'bar',
        data: userCounts,
        itemStyle: {
          color: '#3b82f6',
          borderRadius: [0, 4, 4, 0]
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(59, 130, 246, 0.5)' }
        },
        label: {
          show: true,
          position: 'right',
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 10,
          formatter: (params: any) => {
            return `${params.value} (${processedData[params.dataIndex]?.percentage.toFixed(1)}%)`;
          }
        }
      },
      {
        name: '帖子数',
        type: 'bar',
        data: postCounts,
        itemStyle: {
          color: '#8b5cf6',
          borderRadius: [0, 4, 4, 0]
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(139, 92, 246, 0.5)' }
        }
      }
    ]
  };
}
