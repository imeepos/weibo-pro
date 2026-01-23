import React from 'react'
import { EChart } from '@sker/ui/components/ui/echart'
import { motion } from 'framer-motion'
import { useTheme } from '@/hooks/useTheme'
import type { PropagationVelocity } from '@sker/sdk'

interface PropagationVelocityGaugeProps {
  data: PropagationVelocity | null
  loading?: boolean
  error?: Error | null
  className?: string
}

/**
 * 传播速度仪表盘组件
 *
 * 显示：
 * 1. 病毒系数（仪表盘）
 * 2. 峰值速度（数字）
 * 3. 加速阶段（标签）
 * 4. 小时增长率趋势（曲线图）
 */
const PropagationVelocityGauge: React.FC<PropagationVelocityGaugeProps> = ({
  data,
  loading = false,
  error = null,
  className = ''
}) => {
  const { isDark } = useTheme()

  // 加载状态
  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ minHeight: 400 }}>
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ minHeight: 400 }}>
        <div className="text-destructive">加载失败: {error.message}</div>
      </div>
    )
  }

  // 无数据状态
  if (!data) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ minHeight: 400 }}>
        <div className="text-muted-foreground">暂无传播速度数据</div>
      </div>
    )
  }

  // 加速阶段标签样式
  const phaseConfig = {
    accelerating: { label: '加速中', color: '#10b981' },  // 绿色
    decelerating: { label: '减速中', color: '#f59e0b' },  // 橙色
    stable: { label: '稳定', color: '#3b82f6' },         // 蓝色
  }

  const phase = phaseConfig[data.accelerationPhase]

  // 仪表盘配置
  const gaugeOption = React.useMemo(() => ({
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 10,
        splitNumber: 10,
        itemStyle: {
          color: autoColor,
          shadowColor: autoColor,
          shadowBlur: 10,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
        },
        progress: {
          show: true,
          roundCap: true,
          width: 18,
        },
        pointer: {
          icon: 'path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.81557,732.63423 2083.81557,729.017692 C2083.81557,728.930412 2083.81732,728.84314 2083.82081,728.755929 L2088.2792,617.312956 C2088.32396,616.194028 2089.24407,615.30999 2090.36389,615.30999 Z',
          length: '75%',
          width: 16,
          offsetCenter: [0, '5%'],
        },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [[1, isDark ? '#374151' : '#e5e7eb']],
          },
        },
        axisTick: {
          distance: -18,
          length: 6,
          lineStyle: {
            color: isDark ? '#9ca3af' : '#6b7280',
            width: 2,
          },
        },
        splitLine: {
          distance: -18,
          length: 18,
          lineStyle: {
            color: isDark ? '#9ca3af' : '#6b7280',
            width: 3,
          },
        },
        axisLabel: {
          distance: -5,
          color: isDark ? '#f3f4f6' : '#111827',
          fontSize: 14,
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}',
          color: isDark ? '#f3f4f6' : '#111827',
          fontSize: 40,
          offsetCenter: [0, '70%'],
        },
        data: [
          {
            value: data.viralCoefficient,
            name: '病毒系数',
          },
        ],
      },
    ],
  }), [data.viralCoefficient, isDark])

  // 趋势图配置
  const trendOption = React.useMemo(() => {
    const growthRates = data.hourlyGrowthRates.map((rate, index) => ({
      hour: index,
      value: rate ?? 0,
    }))

    return {
      title: {
        text: '小时增长率趋势',
        left: 'center',
        textStyle: { color: isDark ? '#f3f4f6' : '#111827' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: { color: '#ffffff' },
      },
      xAxis: {
        type: 'category',
        data: growthRates.map(d => `Hour ${d.hour}`),
        axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
        axisLabel: { color: isDark ? '#9ca3af' : '#6b7280' },
      },
      yAxis: {
        type: 'value',
        name: '增长率 (%)',
        axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
        axisLabel: { color: isDark ? '#9ca3af' : '#6b7280' },
        splitLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
      },
      series: [
        {
          name: '增长率',
          type: 'line',
          data: growthRates.map(d => d.value),
          smooth: true,
          lineStyle: { color: phase.color, width: 2 },
          itemStyle: { color: phase.color },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${phase.color}40` },
                { offset: 1, color: `${phase.color}05` },
              ],
            },
          },
        },
      ],
    }
  }, [data.hourlyGrowthRates, phase.color, isDark])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-full space-y-6 ${className}`}
    >
      {/* 顶部指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 病毒系数仪表盘 */}
        <div className="bg-card rounded-lg p-4 shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-center">病毒系数</h3>
          <div style={{ height: 200 }}>
            <EChart option={gaugeOption} opts={{ renderer: 'canvas' }} height={200} />
          </div>
          <p className="text-sm text-muted-foreground text-center mt-2">
            平均每个帖子带来 {data.viralCoefficient.toFixed(2)} 次转发
          </p>
        </div>

        {/* 峰值速度 */}
        <div className="bg-card rounded-lg p-4 shadow-md flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold mb-2">峰值速度</h3>
          <div className="text-5xl font-bold" style={{ color: phase.color }}>
            {data.peakVelocity.toFixed(1)}%
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            最高小时增长率
          </p>
        </div>

        {/* 加速阶段 */}
        <div className="bg-card rounded-lg p-4 shadow-md flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold mb-2">当前阶段</h3>
          <div
            className="px-6 py-3 rounded-full text-white font-bold text-xl"
            style={{ backgroundColor: phase.color }}
          >
            {phase.label}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {data.accelerationPhase === 'accelerating' && '传播速度正在加快'}
            {data.accelerationPhase === 'decelerating' && '传播速度正在减缓'}
            {data.accelerationPhase === 'stable' && '传播速度相对稳定'}
          </p>
        </div>
      </div>

      {/* 小时增长率趋势图 */}
      <div className="bg-card rounded-lg p-4 shadow-md">
        <div style={{ height: 300 }}>
          <EChart option={trendOption} opts={{ renderer: 'canvas' }} height={300} />
        </div>
      </div>
    </motion.div>
  )
}

export default PropagationVelocityGauge

// 辅助函数：自动颜色（基于病毒系数）
function autoColor(value: number) {
  if (value >= 7) return '#10b981'  // 绿色 - 高传播
  if (value >= 4) return '#3b82f6'  // 蓝色 - 中等传播
  if (value >= 2) return '#f59e0b'  // 橙色 - 低传播
  return '#ef4444'                  // 红色 - 极低传播
}
