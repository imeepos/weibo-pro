import React, { useState, useMemo, useCallback } from 'react'
import { Network } from 'lucide-react'
import type { UserRelationNetwork, UserRelationType } from '@sker/sdk'
import { WordCloud, type WordCloudItem } from '@sker/ui/components/ui/word-cloud'
import { ChartState } from '@sker/ui/components/ui/chart-state'
import { ToggleGroup, ToggleGroupItem } from '@sker/ui/components/ui/toggle-group'
import { cn } from '@/utils'

interface UserRelationWordCloudProps {
  network: UserRelationNetwork | null
  title?: string
  height?: number
  className?: string
  isLoading?: boolean
  error?: Error | null
  maxWords?: number
  sizeRange?: [number, number]
  onWordClick?: (user: { id: string; name: string; connectionCount: number }) => void
}

/**
 * 计算每个用户的连线数
 */
function calculateUserConnections(
  network: UserRelationNetwork,
  relationType: UserRelationType
): Map<string, number> {
  const connections = new Map<string, number>()

  // 初始化所有节点的连线数为0
  network.nodes.forEach((node) => {
    connections.set(node.id, 0)
  })

  // 统计每个用户的连线数
  network.edges.forEach((edge) => {
    // 如果指定了关系类型，检查该边是否有对应类型的互动
    if (relationType !== 'comprehensive') {
      // 优先检查 interactions 字段（comprehensive 类型的边会有这个字段）
      if (edge.interactions) {
        const interactionCount = relationType === 'like' ? edge.interactions.likes
          : relationType === 'comment' ? edge.interactions.comments
          : relationType === 'repost' ? edge.interactions.reposts
          : 0
        // 如果该类型的互动数为0或undefined，跳过这条边
        if (!interactionCount || interactionCount <= 0) {
          return
        }
      } else if (edge.type !== relationType) {
        // 如果没有 interactions 字段，则回退到检查 edge.type
        return
      }
    }

    // source 和 target 都计入连线数
    const sourceCount = connections.get(edge.source) || 0
    const targetCount = connections.get(edge.target) || 0
    connections.set(edge.source, sourceCount + 1)
    connections.set(edge.target, targetCount + 1)
  })

  return connections
}

/**
 * 根据影响力分配颜色
 */
function getInfluenceColor(influence: number): string {
  if (influence >= 80) return '#f59e0b' // 琥珀色
  if (influence >= 60) return '#3b82f6' // 蓝色
  if (influence >= 40) return '#10b981' // 绿色
  if (influence >= 20) return '#8b5cf6' // 紫色
  return '#6b7280' // 灰色
}

/**
 * 转换为词云数据
 */
function convertToWordCloudData(
  network: UserRelationNetwork,
  relationType: UserRelationType,
  maxWords: number
): WordCloudItem[] {
  const connections = calculateUserConnections(network, relationType)

  // 创建用户数据数组
  const userData = network.nodes
    .map((node) => ({
      id: node.id,
      name: node.name,
      connectionCount: connections.get(node.id) || 0,
      influence: node.influence,
    }))
    .filter((user) => user.connectionCount > 0) // 过滤掉连线数为0的用户
    .sort((a, b) => b.connectionCount - a.connectionCount) // 按连线数降序排序
    .slice(0, maxWords) // 限制最大词数

  // 转换为词云数据格式
  return userData.map((user) => ({
    name: user.name,
    value: user.connectionCount,
    color: getInfluenceColor(user.influence),
  }))
}

export function UserRelationWordCloud({
  network,
  title = '用户关系词云',
  height = 400,
  className,
  isLoading = false,
  error = null,
  maxWords = 50,
  sizeRange = [12, 40],
  onWordClick,
}: UserRelationWordCloudProps) {
  const [relationType, setRelationType] = useState<UserRelationType>('comprehensive')

  // 计算词云数据
  const wordCloudData = useMemo(() => {
    if (!network || network.nodes.length === 0 || network.edges.length === 0) {
      return []
    }
    return convertToWordCloudData(network, relationType, maxWords)
  }, [network, relationType, maxWords])

  // 处理词云点击事件
  const handleWordClick = useCallback(
    (item: WordCloudItem) => {
      if (!onWordClick || !network) return

      const connections = calculateUserConnections(network, relationType)
      const node = network.nodes.find((n) => n.name === item.name)

      if (node) {
        onWordClick({
          id: node.id,
          name: node.name,
          connectionCount: connections.get(node.id) || 0,
        })
      }
    },
    [onWordClick, network, relationType]
  )

  // 自定义 Tooltip
  const tooltipFormatter = useCallback(
    (item: WordCloudItem) => {
      if (!network) return ''

      const node = network.nodes.find((n) => n.name === item.name)
      if (!node) return ''

      return `
        <div style="font-weight: bold; margin-bottom: 4px;">${item.name}</div>
        <div>连线数: <span style="font-weight: bold;">${item.value}</span></div>
        <div>影响力: <span style="font-weight: bold;">${node.influence}</span></div>
      `
    },
    [network]
  )

  // 处理关系类型切换
  const handleRelationTypeChange = useCallback((value: string) => {
    if (value) {
      setRelationType(value as UserRelationType)
    }
  }, [])

  // 判断是否为空数据
  const isEmpty = !network || network.nodes.length === 0 || network.edges.length === 0 || wordCloudData.length === 0

  return (
    <div className={cn('bg-muted/20 rounded-xl p-5 border border-border/40', className)}>
      {/* 标题和关系类型切换器 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Network className="w-4 h-4" />
          {title}
        </h3>
        <ToggleGroup type="single" value={relationType} onValueChange={handleRelationTypeChange}>
          <ToggleGroupItem value="comprehensive">全部</ToggleGroupItem>
          <ToggleGroupItem value="comment">评论</ToggleGroupItem>
          <ToggleGroupItem value="like">点赞</ToggleGroupItem>
          <ToggleGroupItem value="repost">转发</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* 词云图表 */}
      <div style={{ height: `${height}px` }}>
        <ChartState
          loading={isLoading}
          error={error?.message}
          empty={isEmpty}
        >
          <WordCloud
            data={wordCloudData}
            height={height}
            sizeRange={sizeRange}
            tooltipFormatter={tooltipFormatter}
            onWordClick={handleWordClick}
          />
        </ChartState>
      </div>
    </div>
  )
}
