'use client'

import React from 'react'
import { Settings, X } from 'lucide-react'

export interface RunConfigDialogHeaderProps {
  onCancel: () => void
}

/**
 * 运行配置对话框头部
 *
 * 包含标题图标、标题文本与关闭按钮
 */
export function RunConfigDialogHeader({ onCancel }: RunConfigDialogHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
          <Settings className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <h3 className="text-lg font-semibold text-foreground">运行配置</h3>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      >
        <X className="h-5 w-5" strokeWidth={1.8} />
      </button>
    </div>
  )
}
