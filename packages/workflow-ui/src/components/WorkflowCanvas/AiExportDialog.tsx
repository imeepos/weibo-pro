'use client'
import React, { useState, useMemo } from 'react'
import { Copy, Check, Download, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@sker/ui/components/ui/dialog'
import { Button } from '@sker/ui/components/ui/button'
import { Badge } from '@sker/ui/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sker/ui/components/ui/tabs'
import { Label } from '@sker/ui/components/ui/label'
import { Input } from '@sker/ui/components/ui/input'
import type { WorkflowGraphAst } from '@sker/workflow'
import { exportWorkflowForAi, getExportStats } from '../../utils/ai-export'

interface AiExportDialogProps {
  visible: boolean
  workflow: WorkflowGraphAst | null
  onClose: () => void
}

/**
 * AI导出对话框
 *
 * 设计理念：
 * - 提供多种导出格式选项
 * - 自动截断长文本
 * - 一键复制功能
 * - 显示统计信息
 */
export function AiExportDialog({ visible, workflow, onClose }: AiExportDialogProps) {
  const [copied, setCopied] = useState(false)
  const [maxTextLength, setMaxTextLength] = useState(100)
  const [includePositions, setIncludePositions] = useState(false)
  const [includeStates, setIncludeStates] = useState(false)

  // 生成导出数据
  const exportedData = useMemo(() => {
    if (!workflow) return ''
    return exportWorkflowForAi(workflow, {
      maxTextLength,
      includePositions,
      includeStates,
    })
  }, [workflow, maxTextLength, includePositions, includeStates])

  // 统计信息
  const stats = useMemo(() => {
    if (!workflow) return null
    return getExportStats(workflow)
  }, [workflow])

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportedData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  // 下载为文件
  const handleDownload = () => {
    const blob = new Blob([exportedData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflow?.name || 'workflow'}-ai-export.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>导出AI分析格式</DialogTitle>
          <DialogDescription>
            将工作流导出为AI可读格式，自动截断长文本，方便复制到AI开发工具进行分析
          </DialogDescription>
        </DialogHeader>

        {stats && (
          <div className="flex flex-wrap gap-2 py-2 border-b">
            <Badge variant="secondary">
              <Info className="w-3 h-3 mr-1" />
              {stats.nodeCount} 个节点
            </Badge>
            <Badge variant="secondary">{stats.edgeCount} 条连线</Badge>
            <Badge variant="secondary">大小: {stats.estimatedSize}</Badge>
          </div>
        )}

        <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">预览</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex gap-2 mb-2">
              <Button onClick={handleCopy} size="sm" className="flex-1">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    复制
                  </>
                )}
              </Button>
              <Button onClick={handleDownload} size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                下载
              </Button>
            </div>

            <div className="flex-1 overflow-auto border rounded-md bg-muted/50">
              <pre className="p-4 text-xs">
                <code>{exportedData}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="maxLength">文本截断长度（字符数）</Label>
              <Input
                id="maxLength"
                type="number"
                min={10}
                max={500}
                value={maxTextLength}
                onChange={(e) => setMaxTextLength(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                超过此长度的文本将被截断，建议50-150字符
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="includePositions"
                type="checkbox"
                checked={includePositions}
                onChange={(e) => setIncludePositions(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="includePositions">包含节点位置信息</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="includeStates"
                type="checkbox"
                checked={includeStates}
                onChange={(e) => setIncludeStates(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="includeStates">包含节点运行状态</Label>
            </div>

            {stats && (
              <div className="pt-4 border-t space-y-2">
                <Label>节点类型统计</Label>
                <div className="flex flex-wrap gap-1">
                  {stats.nodeTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
