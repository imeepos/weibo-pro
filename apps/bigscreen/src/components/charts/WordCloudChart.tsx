import React from "react"
import { cn, getSentimentColorHex } from "@/utils"
import { useWordCloudData } from "@/hooks/useChartData"
import { WordCloud, type WordCloudItem } from "@sker/ui/components/ui/word-cloud"
import { ChartState } from '@sker/ui/components/ui/chart-state'
interface KeywordData {
  keyword: string;
  weight: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface WordCloudChartProps {
  title?: string
  height?: number
  className?: string
  maxWords?: number
  data?: KeywordData[] | null; // 支持外部传入数据
}

const WordCloudChart: React.FC<WordCloudChartProps> = ({
  title = "关键词词云",
  height = 0,
  className,
  maxWords = 100,
  data: propData
}) => {
  const hookData = useWordCloudData(maxWords);

  // 优先使用 props 数据，否则使用 hook 数据
  const data = propData ?? hookData.data;
  const loading = propData === undefined ? hookData.loading : false;
  const error = propData === undefined ? hookData.error : null;
  const refetch = hookData.refetch;

  const dataRef = React.useRef(data)

  // 更新 data ref
  React.useEffect(() => {
    dataRef.current = data
  }, [data])

  // 使用 JSON 序列化进行深度比较，避免引用变化导致重新计算
  const dataKey = React.useMemo(() => {
    if (!data) return 'empty'
    return JSON.stringify(data.slice(0, maxWords).map(item => [item.keyword, item.weight, item.sentiment]))
  }, [data, maxWords])

  const wordCloudData: WordCloudItem[] = React.useMemo(() => {
    if (!data) return []
    return data.slice(0, maxWords).map((item) => ({
      name: item.keyword,
      value: item.weight,
      color: getSentimentColorHex(item.sentiment || "neutral"),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, maxWords])

  // 稳定的 tooltipFormatter（不依赖 data）
  const tooltipFormatter = React.useCallback(
    (item: WordCloudItem) => {
      const currentData = dataRef.current
      const originalItem = currentData?.find((d) => d.keyword === item.name)
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
    []
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
        height={height || undefined}
        className={cn("w-full h-full", className)}
        tooltipFormatter={tooltipFormatter}
        animated={true}
      />
    </ChartState>
  )
}

export default WordCloudChart
