import React from "react"
import { cn, getSentimentColorHex } from "@/utils"
import { useWordCloudData } from "@/hooks/useChartData"
import { ChartState } from "@sker/ui/components/ui/chart-state"
import { WordCloud, WordCloudItem } from "@sker/ui/components/ui/word-cloud"

interface WordCloudChartProps {
  title?: string
  height?: number
  className?: string
  maxWords?: number
}

const WordCloudChart: React.FC<WordCloudChartProps> = ({
  title = "关键词词云",
  height = 0,
  className,
  maxWords = 100,
}) => {
  const { data, loading, error, refetch } = useWordCloudData(maxWords)

  const wordCloudData: WordCloudItem[] = React.useMemo(() => {
    if (!data) return []
    return data.slice(0, maxWords).map((item) => ({
      name: item.keyword,
      value: item.weight,
      color: getSentimentColorHex(item.sentiment || "neutral"),
    }))
  }, [data, maxWords])

  const tooltipFormatter = React.useCallback(
    (item: WordCloudItem) => {
      const originalItem = data?.find((d) => d.keyword === item.name)
      if (!originalItem) return ""

      const sentiment = originalItem.sentiment || "neutral"
      const sentimentText = {
        positive: "正面",
        negative: "负面",
        neutral: "中性",
      }[sentiment]

      return `
        <div style="font-weight: bold; margin-bottom: 4px;">${item.name}</div>
        <div>权重: <span style="font-weight: bold;">${item.value}</span></div>
        <div>情感: <span style="color: ${getSentimentColorHex(sentiment)}; font-weight: bold;">${sentimentText}</span></div>
      `
    },
    [data]
  )

  return (
    <ChartState
      loading={loading}
      error={error}
      empty={!data || data.length === 0}
      loadingText="加载词云数据..."
      emptyText="暂无词云数据"
      onRetry={refetch}
      className={className}
    >
      <WordCloud
        data={wordCloudData}
        height={height}
        className={cn("w-full h-full", className)}
        tooltipFormatter={tooltipFormatter}
        animated={true}
      />
    </ChartState>
  )
}

export default WordCloudChart
