'use client'

import React, { useCallback } from 'react'
import { Button } from '@sker/ui/components/ui/button'
import { ScrollArea } from '@sker/ui/components/ui/scroll-area'

export interface TimeTravelDataPanelProps {
  /** 格式化后的 JSON 数据 */
  formattedData: string | null
}

/** 展开区域：完整数据查看 */
export const TimeTravelDataPanel: React.FC<TimeTravelDataPanelProps> = ({
  formattedData,
}) => {
  const handleCopy = useCallback(() => {
    if (formattedData) {
      navigator.clipboard.writeText(formattedData)
    }
  }, [formattedData])

  return (
    <div className="border-t border-border px-6 py-4 flex-1 min-h-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">完整数据</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 text-xs"
        >
          复制
        </Button>
      </div>
      <ScrollArea className="h-[280px] rounded-md border border-border bg-muted/30">
        <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap break-words overflow-wrap-anywhere">
          {formattedData}
        </pre>
      </ScrollArea>
    </div>
  )
}
