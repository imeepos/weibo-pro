import React from "react"
import { useNavigate } from "react-router-dom"
import { Maximize2 } from "lucide-react"
import { cn, getSentimentColorHex } from "@/utils"
import { WordCloud, type WordCloudItem, type WordCloudRef } from "@sker/ui/components/ui/word-cloud"
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
  data?: KeywordData[] | null
}

export interface WordCloudChartRef {
  exportAsPNG: (filename?: string) => void
}

// 简单哈希函数
function hashData(data: KeywordData[] | null | undefined, maxWords: number): string {
  if (!data || data.length === 0) return 'empty'
  const len = Math.min(data.length, maxWords)
  let hash = 0
  for (let i = 0; i < Math.min(len, 30); i++) {
    const item = data[i]
    if (item) {
      hash = (((hash << 5) - hash) + (item.keyword?.length || 0) + (item.weight || 0)) | 0
    }
  }
  return `${len}-${hash}`
}

const WordCloudChart = React.forwardRef<WordCloudChartRef, WordCloudChartProps>(({
  title = "关键词词云",
  height = 0,
  className,
  maxWords = 100,
  data
}, ref) => {
  const navigate = useNavigate()
  const dataRef = React.useRef(data)
  const wordCloudRef = React.useRef<WordCloudRef>(null)

  const handleFullscreen = () => {
    navigate('/word-cloud')
  }

  React.useEffect(() => {
    dataRef.current = data
  }, [data])

  const dataHash = React.useMemo(() => hashData(data, maxWords), [data, maxWords])

  const wordCloudData: WordCloudItem[] = React.useMemo(() => {
    if (!data || data.length === 0) return []
    const limit = Math.min(data.length, maxWords)
    const result: WordCloudItem[] = []
    for (let i = 0; i < limit; i++) {
      const item = data[i]
      if (item?.keyword) {
        result.push({
          name: item.keyword,
          value: item.weight ?? 0,
          color: getSentimentColorHex(item.sentiment || "neutral"),
        })
      }
    }
    return result
  }, [dataHash, maxWords])

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

  // 暴露导出方法
  React.useImperativeHandle(ref, () => ({
    exportAsPNG: (filename?: string) => {
      wordCloudRef.current?.exportAsPNG(filename)
    }
  }))

  return (
    <div className="relative h-full w-full">
      <button
        onClick={handleFullscreen}
        className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-background/80 hover:bg-background transition-opacity opacity-0 hover:opacity-100 group"
        title="全屏查看"
      >
        <Maximize2 className="w-4 h-4 text-foreground" />
      </button>

      <ChartState
        loading={false}
        error={null}
        empty={!data || data.length === 0}
        loadingText="加载词云数据..."
        emptyText="暂无词云数据"
        onRetry={() => {}}
        className={className}
      >
        <WordCloud
          ref={wordCloudRef}
          data={wordCloudData}
          height={height || undefined}
          className={cn("w-full h-full", className)}
          tooltipFormatter={tooltipFormatter}
          animated={true}
        />
      </ChartState>
    </div>
  )
})

WordCloudChart.displayName = 'WordCloudChart'

export default (WordCloudChart as any)
