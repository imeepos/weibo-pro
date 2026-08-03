import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
import { trendData, eventData, multiLineData } from './data'
import { chartConfig, sentimentConfig } from './config'

/** 单折线图示例 */
export function LineChartExampleRender() {
  return (
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
  )
}

/** 柱状图示例 */
export function BarChartExampleRender() {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-[500px]">
      <BarChart data={trendData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" />
      </BarChart>
    </ChartContainer>
  )
}

/** 面积图示例 */
export function AreaChartExampleRender() {
  return (
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
  )
}

/** 饼图示例 */
export function PieChartExampleRender() {
  return (
    <ChartContainer config={sentimentConfig} className="h-[300px] w-[500px]">
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
  )
}

/** 多折线图示例 */
export function MultiLineChartRender() {
  return (
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
  )
}

/** 极简折线图 - 仅展示最基本的 LineChart 用法 */
export function MinimalLineChartRender() {
  return (
    <ChartContainer
      config={{ count: { label: '数量', color: 'var(--chart-1)' } }}
      className="h-[200px] w-[400px]"
    >
      <LineChart data={trendData}>
        <Line type="monotone" dataKey="count" stroke="var(--color-count)" />
      </LineChart>
    </ChartContainer>
  )
}

/** 堆叠面积图示例 */
export function StackedAreaChartRender() {
  return (
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
  )
}

/** 渐变面积图示例 */
export function GradientAreaChartRender() {
  return (
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
  )
}

/** 环形图示例 */
export function DonutChartRender() {
  return (
    <ChartContainer config={sentimentConfig} className="h-[300px] w-[500px]">
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
  )
}

/** 堆叠柱状图示例 */
export function StackedBarChartRender() {
  return (
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
  )
}

/** 带数据点的多折线图示例 */
export function LineChartWithDotsRender() {
  return (
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
  )
}
