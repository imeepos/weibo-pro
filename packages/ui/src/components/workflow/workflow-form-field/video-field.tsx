'use client'

import { useRef, useState } from 'react'
import { cn } from '@udecode/cn'
import { Button } from '@sker/ui/components/ui/button'
import { X, Play, Pause, Maximize } from 'lucide-react'
import { useFileUploadField } from './use-file-upload-field'
import { UploadTriggerButton } from './upload-trigger-button'
import { UploadProgress } from './upload-progress'

export interface VideoFieldProps {
  value: any
  onChange: (value: any) => void
  placeholder?: string
  disabled?: boolean
  uploadEndpoint?: string
  setError: (error: string | null) => void
}

/** 视频上传/预览/播放字段（video） */
export function VideoField({
  value,
  onChange,
  placeholder,
  disabled = false,
  uploadEndpoint,
  setError,
}: VideoFieldProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const { fileInputRef, isUploading, progress, handleFileChange, handleUploadClick } = useFileUploadField({
    type: 'video',
    uploadEndpoint,
    onChange,
    onError: setError,
  })

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
        <UploadTriggerButton
          placeholder={placeholder || '上传视频'}
          disabled={disabled}
          onClick={handleUploadClick}
          className="w-full h-32"
        />
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

      {isUploading && <UploadProgress progress={progress} />}

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
}
