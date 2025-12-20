import type { EChartsOption } from 'echarts';
import type { TimeRange } from '@sker/entities';
import { HTTP_OK, HTTP_CLIENT_ERROR } from './constants';

interface StatusCodeItem {
  statusCode: number;
  count: number;
}

interface TimeSeriesItem {
  date: string;
  count: number;
  tokens: number;
}

export const getStatusCodeChartOption = (data: StatusCodeItem[]): EChartsOption => ({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c} ({d}%)',
  },
  legend: {
    orient: 'vertical',
    right: 'right',
    top: 'center',
  },
  series: [
    {
      name: '状态码',
      type: 'pie',
      radius: ['50%', '70%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      label: {
        show: true,
        position: 'center',
        formatter: () => '状态码',
        fontSize: 16,
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 18,
          fontWeight: 'bold',
        },
      },
      labelLine: {
        show: false,
      },
      data: data.map((item) => ({
        value: item.count,
        name: `${item.statusCode}`,
        itemStyle: {
          color:
            item.statusCode === HTTP_OK
              ? '#10b981'
              : item.statusCode >= HTTP_CLIENT_ERROR && item.statusCode < 500
                ? '#f59e0b'
                : '#ef4444',
        },
      })),
    },
  ],
});

export const getTrendChartOption = (
  data: TimeSeriesItem[],
  timeRange: TimeRange
): EChartsOption => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
    },
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: data.map((item) => {
      const date = new Date(item.date);
      if (timeRange === '1h') {
        return date.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      } else if (timeRange === '6h' || timeRange === '12h' || timeRange === '24h') {
        return date.toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      } else {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    }),
  },
  yAxis: [
    {
      type: 'value',
      name: '请求数',
      position: 'left',
      axisLine: {
        show: true,
        lineStyle: {
          color: '#5470c6',
        },
      },
    },
    {
      type: 'value',
      name: 'Token数',
      position: 'right',
      axisLine: {
        show: true,
        lineStyle: {
          color: '#91cc75',
        },
      },
    },
  ],
  series: [
    {
      name: '请求数',
      type: 'line',
      yAxisIndex: 0,
      smooth: true,
      data: data.map((item) => item.count),
      itemStyle: {
        color: '#5470c6',
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
            { offset: 1, color: 'rgba(84, 112, 198, 0.05)' },
          ],
        },
      },
    },
    {
      name: 'Token数',
      type: 'bar',
      yAxisIndex: 1,
      data: data.map((item) => item.tokens),
      itemStyle: {
        color: '#91cc75',
      },
    },
  ],
});
