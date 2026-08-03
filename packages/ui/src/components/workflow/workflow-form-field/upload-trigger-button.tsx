'use client'

import { cn } from '@udecode/cn'
import { Upload } from 'lucide-react'

export interface UploadTriggerButtonProps {
  placeholder?: string
  disabled?: boolean
  onClick: () => void
  /** 尺寸/布局覆盖类（如 w-32 h-32、w-full h-32 等） */
  className?: string
}

/** 文件上传触发按钮（虚线框 + 上传图标） */
export function UploadTriggerButton({
  placeholder,
  disabled,
  onClick,
  className,
}: UploadTriggerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex items-center justify-center",
        "rounded-lg border-2 border-dashed",
        "transition-all duration-200",
        "hover:border-primary hover:bg-primary/5",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "border-border bg-muted/30",
        className
      )}
    >
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Upload className="h-8 w-8" strokeWidth={1.5} />
        <span className="text-xs font-medium">{placeholder || '上传文件'}</span>
      </div>
    </button>
  )
}
