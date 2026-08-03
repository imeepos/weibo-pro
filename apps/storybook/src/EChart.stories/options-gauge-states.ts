/**
 * EChart stories 的仪表盘 / 加载 / 无动画 / SVG 渲染 option 数据
 * 与业务无关，仅用于展示 EChart 组件的渲染效果。
 */

import type { EChartsOption } from './options';

export const gaugeOption: EChartsOption = {
  title: {
    text: '仪表盘示例',
    left: 'center',
  },
  series: [
    {
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      center: ['50%', '75%'],
      radius: '90%',
      min: 0,
      max: 1,
      splitNumber: 8,
      axisLine: {
        lineStyle: {
          width: 6,
          color: [
            [0.25, '#10b981'],
            [0.5, '#3b82f6'],
            [0.75, '#f59e0b'],
            [1, '#ef4444'],
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
        fontSize: 20,
        distance: -60,
        formatter: (value: number) => {
          if (value === 0.875) {
            return '优秀';
          } else if (value === 0.625) {
            return '良好';
          } else if (value === 0.375) {
            return '一般';
          } else if (value === 0.125) {
            return '差';
          }
          return '';
        },
      },
      title: {
        offsetCenter: [0, '-10%'],
        fontSize: 20,
      },
      detail: {
        fontSize: 30,
        offsetCenter: [0, '-35%'],
        valueAnimation: true,
        formatter: (value: number) => {
          return Math.round(value * 100) + '';
        },
        color: 'inherit',
      },
      data: [
        {
          value: 0.7,
          name: '完成率',
        },
      ],
    },
  ],
};

export const loadingOption: EChartsOption = {
  title: {
    text: '加载中示例',
    left: 'center',
  },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      data: [150, 230, 224, 218, 135, 147, 260],
      type: 'line',
    },
  ],
};

export const withoutAnimationOption: EChartsOption = {
  title: {
    text: '无动画示例',
    left: 'center',
  },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      data: [150, 230, 224, 218, 135, 147, 260],
      type: 'bar',
      itemStyle: {
        color: '#3b82f6',
      },
    },
  ],
};

export const svgRendererOption: EChartsOption = {
  title: {
    text: 'SVG 渲染器示例',
    left: 'center',
    subtext: '使用 SVG 而非 Canvas',
  },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      data: [150, 230, 224, 218, 135, 147, 260],
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#a855f7',
      },
    },
  ],
};
