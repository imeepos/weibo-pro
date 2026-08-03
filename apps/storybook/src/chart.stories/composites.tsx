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
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts'
import { trendData, eventData, multiLineData, colorData } from './data'
import { chartConfig, sentimentConfig, colorConfig } from './config'

/** 综合示例 - 面积图 + 饼图 + 柱状图的组合面板 */
export function CompleteExampleRender() {
  return (
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
          <ChartContainer config={sentimentConfig} className="h-[250px]">
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
  )
}

/** 全部颜色示例 - 饼图 + 柱状图展示 10 色板 */
export function AllColorsRender() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-lg font-semibold">饼图 - 所有颜色</h3>
        <ChartContainer config={colorConfig} className="h-[400px] w-[600px]">
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
        <ChartContainer config={colorConfig} className="h-[300px] w-[800px]">
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
  )
}
