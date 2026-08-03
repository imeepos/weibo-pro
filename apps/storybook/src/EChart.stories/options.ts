/**
 * EChart stories 的折线 / 柱状 / 饼图 / 散点 / 雷达图 option 数据
 * 与业务无关，仅用于展示 EChart 组件的渲染效果。
 */

export type EChartsOption = any;

export const lineOption: EChartsOption = {
  title: {
    text: '折线图示例',
    left: 'center',
  },
  tooltip: {
    trigger: 'axis',
  },
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      name: '访问量',
      type: 'line',
      data: [820, 932, 901, 934, 1290, 1330, 1320],
      smooth: true,
      itemStyle: {
        color: '#3b82f6',
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
          ],
        },
      },
    },
  ],
};

export const barOption: EChartsOption = {
  title: {
    text: '柱状图示例',
    left: 'center',
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
  },
  xAxis: {
    type: 'category',
    data: ['1月', '2月', '3月', '4月', '5月', '6月'],
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      name: '销量',
      type: 'bar',
      data: [120, 200, 150, 80, 70, 110],
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#8b5cf6' },
            { offset: 1, color: '#a855f7' },
          ],
        },
      },
    },
  ],
};

export const pieOption: EChartsOption = {
  title: {
    text: '饼图示例',
    left: 'center',
  },
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c} ({d}%)',
  },
  legend: {
    orient: 'vertical',
    left: 'left',
  },
  series: [
    {
      name: '访问来源',
      type: 'pie',
      radius: '50%',
      data: [
        { value: 1048, name: '搜索引擎' },
        { value: 735, name: '直接访问' },
        { value: 580, name: '邮件营销' },
        { value: 484, name: '联盟广告' },
        { value: 300, name: '视频广告' },
      ],
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

export const scatterOption: EChartsOption = {
  title: {
    text: '散点图示例',
    left: 'center',
  },
  tooltip: {
    trigger: 'item',
  },
  xAxis: {
    type: 'value',
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      name: '数据点',
      type: 'scatter',
      data: [
        [10, 8.04],
        [8, 6.95],
        [13, 7.58],
        [9, 8.81],
        [11, 8.33],
        [14, 9.96],
        [6, 7.24],
        [4, 4.26],
        [12, 10.84],
        [7, 4.82],
        [5, 5.68],
      ],
      symbolSize: 20,
      itemStyle: {
        color: '#10b981',
      },
    },
  ],
};

export const radarOption: EChartsOption = {
  title: {
    text: '雷达图示例',
    left: 'center',
  },
  tooltip: {
    trigger: 'item',
  },
  radar: {
    indicator: [
      { name: '销售', max: 6500 },
      { name: '管理', max: 16000 },
      { name: '信息技术', max: 30000 },
      { name: '客服', max: 38000 },
      { name: '研发', max: 52000 },
      { name: '市场', max: 25000 },
    ],
  },
  series: [
    {
      name: '预算 vs 开销',
      type: 'radar',
      data: [
        {
          value: [4300, 10000, 28000, 35000, 50000, 19000],
          name: '预算',
          itemStyle: {
            color: '#3b82f6',
          },
          areaStyle: {
            opacity: 0.3,
          },
        },
        {
          value: [5000, 14000, 28000, 31000, 42000, 21000],
          name: '开销',
          itemStyle: {
            color: '#ef4444',
          },
          areaStyle: {
            opacity: 0.3,
          },
        },
      ],
    },
  ],
};
