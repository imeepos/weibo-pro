'use client'

import React from 'react'
import { Play } from 'lucide-react'
import { Button } from '@sker/ui/components/ui/button'

export interface RunConfigDialogFooterProps {
  onCancel: () => void
  onConfirm: () => void
}

/**
 * 运行配置对话框底部操作区
 *
 * 包含「取消」与「开始运行」按钮
 */
export function RunConfigDialogFooter({ onCancel, onConfirm }: RunConfigDialogFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-border p-6">
      <Button
        variant="outline"
        onClick={onCancel}
      >
        取消
      </Button>
      <Button
        onClick={onConfirm}
        className="gap-2"
      >
        <Play className="h-4 w-4" strokeWidth={2} />
        <span>开始运行</span>
      </Button>
    </div>
  )
}
