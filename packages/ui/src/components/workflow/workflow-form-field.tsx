'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@udecode/cn'
import { MarkdownEditor } from '@sker/ui/components/ui/markdown-editor'
import { ImageEditor } from '@sker/ui/components/ui/image-editor'
import type { Annotation, CropArea } from '@sker/ui/components/ui/image-editor'
import { useUploadFile } from '@sker/ui/hooks/use-upload-file'
import { Button } from '@sker/ui/components/ui/button'
import { Upload, X, Play, Pause, Maximize } from 'lucide-react'

/** 支持的输入字段类型 */
export type InputFieldType =
  | 'string'
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime-local'
  | 'image'
  | 'video'
  | 'audio'
  | 'any'

export interface WorkflowFormFieldProps {
  label: string
  value: any
  type?: InputFieldType
  onChange: (value: any) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
  uploadEndpoint?: string  // 图片上传接口
}

export function WorkflowFormField({
  label,
  value,
  type = 'any',
  onChange,
  placeholder,
  error: externalError,
  disabled = false,
  className,
  uploadEndpoint,
}: WorkflowFormFieldProps) {
  const [localValue, setLocalValue] = useState(formatValueForInput(value, type))
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  // 图片编辑相关状态
  const [showEditor, setShowEditor] = useState(false)
  const [imageAnnotations, setImageAnnotations] = useState<Annotation[]>([])
  const [imageCropArea, setImageCropArea] = useState<CropArea | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 视频播放相关状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // 图片上传 hook
  const { isUploading, progress, uploadFile } = useUploadFile({
    endpoint: uploadEndpoint || '/api/upload/file',
    onSuccess: (file) => {
      onChange(file.url)
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatValueForInput(value, type))
    }
  }, [value, type, isFocused])

  useEffect(() => {
    if (externalError) {
      setError(externalError)
    }
  }, [externalError])

  const handleBlur = () => {
    setIsFocused(false)
    if (disabled) return

    try {
      const parsedValue = parseValue(localValue, type)
      setError(null)
      onChange(parsedValue)
    } catch (err) {
      setError(err instanceof Error ? err.message : '输入格式错误')
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled) {
      try {
        const parsedValue = parseValue(localValue, type)
        setError(null)
        onChange(parsedValue)
      } catch (err) {
        setError(err instanceof Error ? err.message : '输入格式错误')
      }
    }
  }

  const handleChange = (newValue: string | boolean) => {
    const stringValue = String(newValue)
    setLocalValue(stringValue)
    setError(null)

    if (disabled) return

    // 实时同步策略：根据类型决定是否立即同步
    try {
      let parsedValue: any

      switch (type) {
        case 'text':
        case 'string':
        case 'textarea':
          // 文本类型：直接同步字符串
          parsedValue = stringValue
          break

        case 'number':
          // 数字类型：尝试解析，失败则不同步（等待用户输入完成）
          if (!stringValue.trim()) {
            parsedValue = 0
          } else {
            const num = Number(stringValue)
            if (isNaN(num)) {
              // 输入到一半，等待用户继续输入
              return
            }
            parsedValue = num
          }
          break

        case 'any':
          // any 类型：智能解析
          parsedValue = parseSmartValue(stringValue)
          break

        default:
          // 其他类型保持 onBlur 行为
          return
      }

      onChange(parsedValue)
    } catch {
      // 解析失败，等待用户继续输入
    }
  }

  // 图片/视频/音频上传处理
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')

    if (type === 'image' && !isImage) {
      setError('请选择图片文件')
      return
    }

    if (type === 'video' && !isVideo) {
      setError('请选择视频文件')
      return
    }

    if (type === 'audio' && !isAudio) {
      setError('请选择音频文件')
      return
    }

    await uploadFile(file)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageDelete = () => {
    onChange('')
    setImageAnnotations([])
    setImageCropArea(null)
  }

  const handleImageClick = () => {
    if (value) {
      setShowEditor(true)
    }
  }

  const handleEditorSave = (data: { annotations?: Annotation[], crop?: CropArea }) => {
    setImageAnnotations(data.annotations || [])
    setImageCropArea(data.crop || null)
    setShowEditor(false)
  }

  // 视频相关处理
  const handleVideoDelete = () => {
    onChange('')
    setIsPlaying(false)
  }

  const handlePlayPause = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleFullscreen = () => {
    setShowFullscreen(true)
  }

  const handleFullscreenClose = () => {
    setShowFullscreen(false)
    if (videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const baseInputClass = cn(
    'w-full px-3 py-2 text-sm border rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    isFocused ? 'border-primary shadow-sm' : 'border-border hover:border-border/80',
    error ? 'border-destructive/50 bg-destructive/10 focus:border-destructive focus:ring-destructive/50' : 'bg-card text-foreground'
  )

  const renderInput = () => {
    switch (type) {
      case 'image':
        return (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled}
              aria-label="选择图片文件"
            />

            {!value && !isUploading && (
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={disabled}
                className={cn(
                  "relative flex items-center justify-center",
                  "w-32 h-32 rounded-lg border-2 border-dashed",
                  "transition-all duration-200",
                  "hover:border-primary hover:bg-primary/5",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "border-border bg-muted/30"
                )}
              >
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" strokeWidth={1.5} />
                  <span className="text-xs font-medium">{placeholder || '上传图片'}</span>
                </div>
              </button>
            )}

            {value && (
              <div className="relative group w-fit">
                <div
                  className={cn(
                    "relative border rounded-lg overflow-hidden",
                    "bg-muted/30 dark:bg-muted/10",
                    !disabled && "cursor-pointer hover:border-primary transition-colors"
                  )}
                  onClick={!disabled ? handleImageClick : undefined}
                >
                  <img
                    src={value}
                    alt="预览"
                    className="w-full h-auto max-h-64 object-contain"
                  />
                </div>

                {!disabled && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleImageDelete}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  上传中... {progress}%
                </p>
              </div>
            )}

            {showEditor && value && (
              <ImageEditor
                imageUrl={value}
                initialAnnotations={imageAnnotations}
                initialCrop={imageCropArea}
                onSave={handleEditorSave}
                onClose={() => setShowEditor(false)}
                open={showEditor}
              />
            )}
          </div>
        )

      case 'video':
        return (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled}
              aria-label="选择视频文件"
            />

            {!value && !isUploading && (
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={disabled}
                className={cn(
                  "relative flex items-center justify-center",
                  "w-full h-32 rounded-lg border-2 border-dashed",
                  "transition-all duration-200",
                  "hover:border-primary hover:bg-primary/5",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "border-border bg-muted/30"
                )}
              >
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" strokeWidth={1.5} />
                  <span className="text-xs font-medium">{placeholder || '上传视频'}</span>
                </div>
              </button>
            )}

            {value && (
              <div className="space-y-2">
                <div className="relative group">
                  <div
                    className={cn(
                      "relative border rounded-lg overflow-hidden",
                      "bg-muted/30 dark:bg-muted/10"
                    )}
                  >
                    <video
                      ref={videoRef}
                      src={value}
                      className="w-full h-auto max-h-64 object-contain"
                      controls={false}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                    />
                  </div>

                  {!disabled && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6"
                        onClick={handleFullscreen}
                        type="button"
                      >
                        <Maximize className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-6 w-6"
                        onClick={handleVideoDelete}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={handlePlayPause}
                    disabled={disabled}
                    type="button"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        暂停
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        播放
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  上传中... {progress}%
                </p>
              </div>
            )}

            {/* 全屏预览模态框 */}
            {showFullscreen && value && (
              <>
                <div
                  className="fixed inset-0 z-[9998] bg-black/90 backdrop-blur-sm"
                  onClick={handleFullscreenClose}
                />
                <div className="fixed left-1/2 top-1/2 z-[9999] w-[90vw] h-[90vh] -translate-x-1/2 -translate-y-1/2 flex flex-col">
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={handleFullscreenClose}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <video
                    src={value}
                    className="w-full h-full object-contain rounded-lg"
                    controls
                    autoPlay
                  />
                </div>
              </>
            )}
          </div>
        )

      case 'audio':
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
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={disabled}
                className={cn(
                  "relative flex items-center justify-center",
                  "w-full h-24 rounded-lg border-2 border-dashed",
                  "transition-all duration-200",
                  "hover:border-primary hover:bg-primary/5",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "border-border bg-muted/30"
                )}
              >
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" strokeWidth={1.5} />
                  <span className="text-xs font-medium">{placeholder || '上传音频'}</span>
                </div>
              </button>
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

            {isUploading && (
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  上传中... {progress}%
                </p>
              </div>
            )}
          </div>
        )

      case 'boolean':
        return (
          <label className={cn(
            'flex items-center cursor-pointer select-none p-2 rounded-lg',
            'hover:bg-accent/30 transition-colors duration-200',
            disabled && 'opacity-50 cursor-not-allowed'
          )}>
            <div className="relative">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => !disabled && onChange(e.target.checked)}
                disabled={disabled}
                className="sr-only"
              />
              <div className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200',
                Boolean(value)
                  ? 'bg-primary border-primary'
                  : 'bg-card border-border'
              )}>
                {Boolean(value) && (
                  <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            <span className="ml-3 text-sm font-medium text-foreground">{label}</span>
          </label>
        )

      case 'number':
        return (
          <div className="relative">
            <input
              type="number"
              className={baseInputClass}
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || '0'}
              disabled={disabled}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
          </div>
        )

      case 'date':
        return (
          <input
            type="date"
            className={baseInputClass}
            value={formatDateForInput(value)}
            onChange={(e) => !disabled && onChange(new Date(e.target.value))}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
          />
        )

      case 'datetime-local':
        return (
          <input
            type="datetime-local"
            className={baseInputClass}
            value={formatDateTimeForInput(value)}
            onChange={(e) => !disabled && onChange(new Date(e.target.value))}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
          />
        )

      case 'textarea':
        return (
          <textarea
            className={cn(baseInputClass, 'resize-y min-h-[80px] font-mono')}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder={placeholder || '在此输入多行文本...'}
            disabled={disabled}
          />
        )

      case 'richtext':
        return (
          <MarkdownEditor
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
            placeholder={placeholder || '输入富文本内容...'}
            disabled={disabled}
            className="min-h-[120px]"
          />
        )

      case 'text':
      case 'string':
      default:
        return (
          <input
            type="text"
            className={baseInputClass}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || getPlaceholder(type)}
            disabled={disabled}
          />
        )
    }
  }

  if (type === 'boolean') {
    return <div className={cn('mb-4', className)}>{renderInput()}</div>
  }

  return (
    <div className={cn('mb-4', className)}>
      {label && <label className="block mb-2 text-xs font-medium text-muted-foreground leading-tight">{label}</label>}
      {renderInput()}
      {error && (
        <div className="mt-2 text-xs text-destructive font-medium animate-pulse">{error}</div>
      )}
    </div>
  )
}

function formatValueForInput(value: any, type: string): string {
  if (value === null || value === undefined) {
    return ''
  }

  switch (type) {
    case 'date':
    case 'datetime-local':
      return value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
    case 'number':
      return String(Number(value))
    case 'boolean':
      return String(Boolean(value))
    case 'text':
    case 'string':
    case 'textarea':
      return String(value)
    default:
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
      }
      return String(value)
  }
}

function formatDateForInput(value: any): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return ''
}

function formatDateTimeForInput(value: any): string {
  if (value instanceof Date) {
    const date = new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    return date.toISOString().slice(0, 16)
  }
  return ''
}

function parseValue(value: string, type: string): any {
  if (!value.trim()) {
    return type === 'number' ? 0 : ''
  }

  switch (type) {
    case 'number':
      const num = Number(value)
      if (isNaN(num)) {
        throw new Error('请输入有效的数字')
      }
      return num

    case 'boolean':
      return value.toLowerCase() === 'true'

    case 'date':
    case 'datetime-local':
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        throw new Error('请输入有效的日期')
      }
      return date

    case 'text':
    case 'string':
    case 'textarea':
      return value

    default:
      return parseSmartValue(value)
  }
}

function parseSmartValue(value: string): any {
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10)
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value)
  }

  if (value === 'true') return true
  if (value === 'false') return false

  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value)
    } catch {
      // Keep as string
    }
  }

  return value
}

function getPlaceholder(type: string): string {
  switch (type) {
    case 'number':
      return '输入数字'
    case 'date':
      return '选择日期'
    case 'datetime-local':
      return '选择日期时间'
    case 'textarea':
      return '输入多行文本...'
    case 'image':
      return '上传图片'
    case 'video':
      return '上传视频'
    case 'audio':
      return '上传音频'
    default:
      return '输入文本...'
  }
}
