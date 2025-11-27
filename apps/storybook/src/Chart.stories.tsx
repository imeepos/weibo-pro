import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@sker/ui/components/ui/chart'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts'

const meta = {
  title: '@sker/ui/ui/Chart',
  component: ChartContainer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ChartContainer>

export default meta
type Story = StoryObj<ReactRenderer>

const trendData = [
  { date: '01-15', count: 234 },
  { date: '01-16', count: 456 },
  { date: '01-17', count: 389 },
  { date: '01-18', count: 612 },
  { date: '01-19', count: 523 },
  { date: '01-20', count: 789 },
  { date: '01-21', count: 645 },
]

const eventData = [
  { name: '正面', value: 342, fill: 'var(--chart-1)' },
  { name: '中性', value: 256, fill: 'var(--chart-2)' },
  { name: '负面', value: 128, fill: 'var(--chart-3)' },
]

const multiLineData = [
  { date: '01-15', positive: 123, negative: 45, neutral: 89 },
  { date: '01-16', positive: 234, negative: 67, neutral: 156 },
  { date: '01-17', positive: 189, negative: 89, neutral: 234 },
  { date: '01-18', positive: 312, negative: 56, neutral: 178 },
  { date: '01-19', positive: 267, negative: 78, neutral: 201 },
  { date: '01-20', positive: 389, negative: 91, neutral: 234 },
  { date: '01-21', positive: 312, negative: 67, neutral: 189 },
]

const chartConfig = {
  count: {
    label: '微博数量',
    color: 'var(--chart-1)',
  },
  positive: {
    label: '正面',
    color: 'var(--chart-1)',
  },
  negative: {
    label: '负面',
    color: 'var(--chart-3)',
  },
  neutral: {
    label: '中性',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

export const LineChartExample: Story = {
  args: {},
  render: () => (
    <ChartContainer config={chartConfig} className="h-[300px] w-[500px]">
      <LineChart data={trendData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          strokeWidth={2}
        />
      </LineChart>
    </ChartContainer>
  ),
}

export const BarChartExample: Story = {
  args: {},
  render: () => (
    <ChartContainer config={chartConfig} className="h-[300px] w-[500px]">
      <BarChart data={trendData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" />
      </BarChart>
    </ChartContainer>
  ),
}

export const AreaChartExample: Story = {
  args: {},
  render: () => (
    <ChartContainer config={chartConfig} className="h-[300px] w-[500px]">
      <AreaChart data={trendData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          fill="var(--color-count)"
          fillOpacity={0.3}
        />
      </AreaChart>
    </ChartContainer>
  ),
}

export const PieChartExample: Story = {
  args: {},
  render: () => (
    <ChartContainer
      config={{
        positive: { label: '正面', color: 'var(--chart-1)' },
        neutral: { label: '中性', color: 'var(--chart-2)' },
        negative: { label: '负面', color: 'var(--chart-3)' },
      }}
      className="h-[300px] w-[500px]"
    >
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={eventData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={{
            fill: 'var(--foreground)',
            fontSize: 12,
          }}
        >
          {eventData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  ),
}

export const MultiLineChart: Story = {
  args: {},
  render: () => (
    <ChartContainer config={chartConfig} className="h-[350px] w-[600px]">
      <LineChart data={multiLineData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="positive"
          stroke="var(--color-positive)"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="neutral"
          stroke="var(--color-neutral)"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="negative"
          stroke="var(--color-negative)"
          strokeWidth={2}
        />
      </LineChart>
    </ChartContainer>
  ),
}

export const CompleteExample: Story = {
  args: {},
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">微博数据趋势分析</h3>
        <ChartContainer config={chartConfig} className="h-[300px] w-[700px]">
          <AreaChart data={multiLineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="positive"
              stackId="1"
              stroke="var(--color-positive)"
              fill="var(--color-positive)"
              fillOpacity={0.8}
            />
            <Area
              type="monotone"
              dataKey="neutral"
              stackId="1"
              stroke="var(--color-neutral)"
              fill="var(--color-neutral)"
              fillOpacity={0.8}
            />
            <Area
              type="monotone"
              dataKey="negative"
              stackId="1"
              stroke="var(--color-negative)"
              fill="var(--color-negative)"
              fillOpacity={0.8}
            />
          </AreaChart>
        </ChartContainer>
      </div>
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h3 className="mb-4 text-lg font-semibold text-foreground">情感分布</h3>
          <ChartContainer
            config={{
              positive: { label: '正面', color: 'var(--chart-1)' },
              neutral: { label: '中性', color: 'var(--chart-2)' },
              negative: { label: '负面', color: 'var(--chart-3)' },
            }}
            className="h-[250px]"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={eventData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={{
                  fill: 'var(--foreground)',
                  fontSize: 12,
                }}
              >
                {eventData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        </div>
        <div>
          <h3 className="mb-4 text-lg font-semibold text-foreground">每日统计</h3>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  ),
}

export const MinimalLineChart: Story = {
  args: {},
  render: () => (
    <ChartContainer
      config={{ count: { label: '数量', color: 'var(--chart-1)' } }}
      className="h-[200px] w-[400px]"
    >
      <LineChart data={trendData}>
        <Line type="monotone" dataKey="count" stroke="var(--color-count)" />
      </LineChart>
    </ChartContainer>
  ),
}

export const StackedAreaChart: Story = {
  args: {},
  render: () => (
    <ChartContainer config={chartConfig} className="h-[350px] w-[700px]">
      <AreaChart data={multiLineData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="positive"
          stackId="1"
          stroke="var(--color-positive)"
          fill="var(--color-positive)"
          fillOpacity={0.8}
        />
        <Area
          type="monotone"
          dataKey="neutral"
          stackId="1"
          stroke="var(--color-neutral)"
          fill="var(--color-neutral)"
          fillOpacity={0.8}
        />
        <Area
          type="monotone"
          dataKey="negative"
          stackId="1"
          stroke="var(--color-negative)"
          fill="var(--color-negative)"
          fillOpacity={0.8}
        />
      </AreaChart>
    </ChartContainer>
  ),
}

export const GradientAreaChart: Story = {
  args: {},
  render: () => (
    <ChartContainer config={chartConfig} className="h-[300px] w-[600px]">
      <AreaChart data={trendData}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          fill="url(#colorCount)"
        />
      </AreaChart>
    </ChartContainer>
  ),
}

export const DonutChart: Story = {
  args: {},
  render: () => (
    <ChartContainer
      config={{
        positive: { label: '正面', color: 'var(--chart-1)' },
        neutral: { label: '中性', color: 'var(--chart-2)' },
        negative: { label: '负面', color: 'var(--chart-3)' },
      }}
      className="h-[300px] w-[500px]"
    >
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={eventData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
        >
          {eventData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  ),
}

export const StackedBarChart: Story = {
  args: {},
  render: () => (
    <ChartContainer config={chartConfig} className="h-[350px] w-[600px]">
      <BarChart data={multiLineData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="positive" stackId="a" fill="var(--color-positive)" />
        <Bar dataKey="neutral" stackId="a" fill="var(--color-neutral)" />
        <Bar dataKey="negative" stackId="a" fill="var(--color-negative)" />
      </BarChart>
    </ChartContainer>
  ),
}

export const LineChartWithDots: Story = {
  args: {},
  render: () => (
    <ChartContainer config={chartConfig} className="h-[300px] w-[600px]">
      <LineChart data={multiLineData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="positive"
          stroke="var(--color-positive)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="neutral"
          stroke="var(--color-neutral)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="negative"
          stroke="var(--color-negative)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  ),
}

const colorData = [
  { name: 'Color 1', value: 100, fill: 'var(--chart-1)' },
  { name: 'Color 2', value: 100, fill: 'var(--chart-2)' },
  { name: 'Color 3', value: 100, fill: 'var(--chart-3)' },
  { name: 'Color 4', value: 100, fill: 'var(--chart-4)' },
  { name: 'Color 5', value: 100, fill: 'var(--chart-5)' },
  { name: 'Color 6', value: 100, fill: 'var(--chart-6)' },
  { name: 'Color 7', value: 100, fill: 'var(--chart-7)' },
  { name: 'Color 8', value: 100, fill: 'var(--chart-8)' },
  { name: 'Color 9', value: 100, fill: 'var(--chart-9)' },
  { name: 'Color 10', value: 100, fill: 'var(--chart-10)' },
]

export const AllColors: Story = {
  args: {},
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-lg font-semibold">饼图 - 所有颜色</h3>
        <ChartContainer
          config={{
            color1: { label: 'Color 1', color: 'var(--chart-1)' },
            color2: { label: 'Color 2', color: 'var(--chart-2)' },
            color3: { label: 'Color 3', color: 'var(--chart-3)' },
            color4: { label: 'Color 4', color: 'var(--chart-4)' },
            color5: { label: 'Color 5', color: 'var(--chart-5)' },
            color6: { label: 'Color 6', color: 'var(--chart-6)' },
            color7: { label: 'Color 7', color: 'var(--chart-7)' },
            color8: { label: 'Color 8', color: 'var(--chart-8)' },
            color9: { label: 'Color 9', color: 'var(--chart-9)' },
            color10: { label: 'Color 10', color: 'var(--chart-10)' },
          }}
          className="h-[400px] w-[600px]"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={colorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150}>
              {colorData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </div>
      <div>
        <h3 className="mb-4 text-lg font-semibold">柱状图 - 所有颜色</h3>
        <ChartContainer
          config={{
            color1: { label: 'Color 1', color: 'var(--chart-1)' },
            color2: { label: 'Color 2', color: 'var(--chart-2)' },
            color3: { label: 'Color 3', color: 'var(--chart-3)' },
            color4: { label: 'Color 4', color: 'var(--chart-4)' },
            color5: { label: 'Color 5', color: 'var(--chart-5)' },
            color6: { label: 'Color 6', color: 'var(--chart-6)' },
            color7: { label: 'Color 7', color: 'var(--chart-7)' },
            color8: { label: 'Color 8', color: 'var(--chart-8)' },
            color9: { label: 'Color 9', color: 'var(--chart-9)' },
            color10: { label: 'Color 10', color: 'var(--chart-10)' },
          }}
          className="h-[300px] w-[800px]"
        >
          <BarChart data={colorData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value">
              {colorData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  ),
}
