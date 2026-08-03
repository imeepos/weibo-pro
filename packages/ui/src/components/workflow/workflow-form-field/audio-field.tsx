'use client'

import { cn } from '@udecode/cn'
import { Button } from '@sker/ui/components/ui/button'
import { X } from 'lucide-react'
import { useFileUploadField } from './use-file-upload-field'
import { UploadTriggerButton } from './upload-trigger-button'
import { UploadProgress } from './upload-progress'

export interface AudioFieldProps {
  value: any
  onChange: (value: any) => void
  placeholder?: string
  disabled?: boolean
  uploadEndpoint?: string
  setError: (error: string | null) => void
}

/** 音频上传/播放字段（audio） */
export function AudioField({
  value,
  onChange,
  placeholder,
  disabled = false,
  uploadEndpoint,
  setError,
}: AudioFieldProps) {
  const { fileInputRef, isUploading, progress, handleFileChange, handleUploadClick } = useFileUploadField({
    type: 'audio',
    uploadEndpoint,
    onChange,
    onError: setError,
  })

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
        aria-label="选择音频文件"
      />

      {!value && !isUploading && (
        <UploadTriggerButton
          placeholder={placeholder || '上传音频'}
          disabled={disabled}
          onClick={handleUploadClick}
          className="w-full h-24"
        />
      )}

      {value && (
        <div className="space-y-2">
          <div
            className={cn(
              "relative border rounded-lg overflow-hidden p-3",
              "bg-muted/30 dark:bg-muted/10"
            )}
          >
            <audio
              controls
              src={value}
              className="w-full"
            />
          </div>

          {!disabled && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onChange('')}
              className="w-full"
              type="button"
            >
              <X className="h-4 w-4 mr-2" />
              删除
            </Button>
          )}
        </div>
      )}

      {isUploading && <UploadProgress progress={progress} />}
    </div>
  )
}
