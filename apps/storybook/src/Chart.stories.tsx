import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { ChartContainer } from '@sker/ui/components/ui/chart'
import {
  LineChartExampleRender,
  BarChartExampleRender,
  AreaChartExampleRender,
  PieChartExampleRender,
  MultiLineChartRender,
  MinimalLineChartRender,
  StackedAreaChartRender,
  GradientAreaChartRender,
  DonutChartRender,
  StackedBarChartRender,
  LineChartWithDotsRender,
} from './chart.stories/components'
import { CompleteExampleRender, AllColorsRender } from './chart.stories/composites'

const meta = {
  title: 'UI/Chart',
  component: ChartContainer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ChartContainer>

export default meta
type Story = StoryObj<ReactRenderer>

export const LineChartExample: Story = {
  args: {},
  render: () => <LineChartExampleRender />,
}

export const BarChartExample: Story = {
  args: {},
  render: () => <BarChartExampleRender />,
}

export const AreaChartExample: Story = {
  args: {},
  render: () => <AreaChartExampleRender />,
}

export const PieChartExample: Story = {
  args: {},
  render: () => <PieChartExampleRender />,
}

export const MultiLineChart: Story = {
  args: {},
  render: () => <MultiLineChartRender />,
}

export const CompleteExample: Story = {
  args: {},
  render: () => <CompleteExampleRender />,
}

export const MinimalLineChart: Story = {
  args: {},
  render: () => <MinimalLineChartRender />,
}

export const StackedAreaChart: Story = {
  args: {},
  render: () => <StackedAreaChartRender />,
}

export const GradientAreaChart: Story = {
  args: {},
  render: () => <GradientAreaChartRender />,
}

export const DonutChart: Story = {
  args: {},
  render: () => <DonutChartRender />,
}

export const StackedBarChart: Story = {
  args: {},
  render: () => <StackedBarChartRender />,
}

export const LineChartWithDots: Story = {
  args: {},
  render: () => <LineChartWithDotsRender />,
}

export const AllColors: Story = {
  args: {},
  render: () => <AllColorsRender />,
}
