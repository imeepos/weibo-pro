import type { Meta, StoryObj } from '@storybook/react';
import { EChart } from '@sker/ui/components/ui/echart';
import {
  lineOption,
  barOption,
  pieOption,
  scatterOption,
  radarOption,
} from './EChart.stories/options';
import {
  gaugeOption,
  loadingOption,
  withoutAnimationOption,
  svgRendererOption,
} from './EChart.stories/options-gauge-states';

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
    option: lineOption,
  },
};

export const BarChart: Story = {
  args: {
    height: 400,
    width: 600,
    animated: true,
    option: barOption,
  },
};

export const PieChart: Story = {
  args: {
    height: 400,
    width: 600,
    animated: true,
    option: pieOption,
  },
};

export const ScatterChart: Story = {
  args: {
    height: 400,
    width: 600,
    animated: true,
    option: scatterOption,
  },
};

export const RadarChart: Story = {
  args: {
    height: 400,
    width: 600,
    animated: true,
    option: radarOption,
  },
};

export const GaugeChart: Story = {
  args: {
    height: 400,
    width: 600,
    animated: true,
    option: gaugeOption,
  },
};

export const LoadingState: Story = {
  args: {
    height: 400,
    width: 600,
    loading: true,
    option: loadingOption,
  },
};

export const WithoutAnimation: Story = {
  args: {
    height: 400,
    width: 600,
    animated: false,
    option: withoutAnimationOption,
  },
};

export const SVGRenderer: Story = {
  args: {
    height: 400,
    width: 600,
    renderer: 'svg',
    option: svgRendererOption,
  },
};
