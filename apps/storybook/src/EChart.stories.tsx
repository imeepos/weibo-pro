import type { Meta, StoryObj } from '@storybook/react';
import { EChart } from '@sker/ui/components/ui/echart';

type EChartsOption = any;

const meta: Meta<typeof EChart> = {
  title: 'Charts/EChart',
  component: EChart,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    height: {
      control: 'number',
      description: '图表高度（像素）',
    },
    width: {
      control: 'text',
      description: '图表宽度（像素或百分比）',
    },
    loading: {
      control: 'boolean',
      description: '是否显示加载状态',
    },
    animated: {
      control: 'boolean',
      description: '是否启用入场动画',
    },
    renderer: {
      control: 'select',
      options: ['canvas', 'svg'],
      description: '渲染器类型',
    },
  },
} satisfies Meta<typeof EChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LineChart: Story = {
  args: {
    height: 400,
    width: 600,
    animated: true,
    option: {
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
    } as EChartsOption,
  },
};

export const BarChart: Story = {
  args: {
    height: 400,
    width: 600,
    animated: true,
    option: {
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
    } as EChartsOption,
  },
};

export const PieChart: Story = {
  args: {
    height: 400,
    width: 600,
    animated: true,
    option: {
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
    } as EChartsOption,
  },
};

export const ScatterChart: Story = {
  args: {
    height: 400,
    width: 600,
    animated: true,
    option: {
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
    } as EChartsOption,
  },
};

export const RadarChart: Story = {
  args: {
    height: 400,
    width: 600,
    animated: true,
    option: {
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
    } as EChartsOption,
  },
};

export const GaugeChart: Story = {
  args: {
    height: 400,
    width: 600,
    animated: true,
    option: {
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
    } as EChartsOption,
  },
};

export const LoadingState: Story = {
  args: {
    height: 400,
    width: 600,
    loading: true,
    option: {
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
    } as EChartsOption,
  },
};

export const WithoutAnimation: Story = {
  args: {
    height: 400,
    width: 600,
    animated: false,
    option: {
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
    } as EChartsOption,
  },
};

export const SVGRenderer: Story = {
  args: {
    height: 400,
    width: 600,
    renderer: 'svg',
    option: {
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
    } as EChartsOption,
  },
};
