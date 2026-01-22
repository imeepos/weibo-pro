import React, { useRef } from "react"
import WordCloudChart, { type WordCloudChartRef } from "@/components/charts/WordCloudChart"
import { useWordCloudData } from "@/hooks/useChartData"
import { Button } from "@sker/ui/components/ui/button"
import { Download } from "lucide-react"
import { MAX_WORD_CLOUD_WORDS } from "@/constants/mockData"

interface KeywordData {
  keyword: string
  weight: number
  sentiment?: 'positive' | 'negative' | 'neutral'
}

// 导出为 CSV
const exportToCSV = (data: KeywordData[]) => {
  if (!data.length) return

  const headers = ['关键词', '权重', '情感']
  const sentimentMap = { positive: '正面', negative: '负面', neutral: '中性' }

  const rows = data.map(item => [
    item.keyword,
    item.weight.toString(),
    sentimentMap[item.sentiment || 'neutral']
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `词云数据_${new Date().toLocaleDateString()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// 导出为 JSON
const exportToJSON = (data: KeywordData[]) => {
  if (!data.length) return

  const sentimentMap = { positive: '正面', negative: '负面', neutral: '中性' }
  const exportData = data.map(item => ({
    关键词: item.keyword,
    权重: item.weight,
    情感: sentimentMap[item.sentiment || 'neutral']
  }))

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `词云数据_${new Date().toLocaleDateString()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const WordCloudPage: React.FC = () => {
  const { data: rawData } = useWordCloudData(MAX_WORD_CLOUD_WORDS)
  const chartRef = useRef<WordCloudChartRef>(null)

  const displayData = rawData?.slice(0, 500) || null

  const handleExportPNG = () => {
    chartRef.current?.exportAsPNG(`词云_${new Date().toLocaleDateString()}.png`)
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      {/* 标题栏 */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">关键词词云</h1>
          <p className="text-sm text-muted-foreground">
            Top 500 关键词分布及情感倾向
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => displayData && exportToCSV(displayData)}
            disabled={!displayData || displayData.length === 0}
          >
            <Download className="w-4 h-4 mr-1" />
            导出 CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => displayData && exportToJSON(displayData)}
            disabled={!displayData || displayData.length === 0}
          >
            <Download className="w-4 h-4 mr-1" />
            导出 JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPNG}
            disabled={!displayData || displayData.length === 0}
          >
            <Download className="w-4 h-4 mr-1" />
            导出 PNG
          </Button>
        </div>
      </div>

      {/* 词云展示区域 */}
      <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden p-4 min-h-0">
        <WordCloudChart
          ref={chartRef}
          data={displayData}
          maxWords={500}
          className="h-full"
        />
      </div>
    </div>
  )
}

export default WordCloudPage
