"use client"

import * as React from "react"
import { Button } from "./button"
import { Upload, Edit, Crop, Image as ImageIcon } from "lucide-react"
import { cn } from "@sker/ui/lib/utils"

interface ImageUploadPreviewProps {
  imageUrl?: string
  isUploading?: boolean
  uploadProgress?: number
  onFileSelect: (file: File) => void | Promise<void>
  onAnnotate?: () => void
  onCrop?: () => void
  annotationCount?: number
  hasCrop?: boolean
  className?: string
}

export const ImageUploadPreview = React.forwardRef<
  HTMLDivElement,
  ImageUploadPreviewProps
>(
  (
    {
      imageUrl,
      isUploading = false,
      uploadProgress = 0,
      onFileSelect,
      onAnnotate,
      onCrop,
      annotationCount = 0,
      hasCrop = false,
      className,
    },
    ref
  ) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件')
        return
      }

      await onFileSelect(file)
    }

    const handleUploadClick = () => {
      fileInputRef.current?.click()
    }

    return (
      <div ref={ref} className={cn("space-y-4", className)} data-slot="image-upload-preview">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-label="选择图片文件"
        />

        {!imageUrl && (
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full"
          >
            <Upload />
            {isUploading ? `上传中 ${uploadProgress}%` : '上传图片'}
          </Button>
        )}

        {imageUrl && (
          <div className="space-y-2" data-slot="image-preview">
            <div
              className={cn(
                "relative rounded-lg overflow-hidden border",
                "bg-muted/30 dark:bg-muted/10"
              )}
              data-slot="image-container"
            >
              <img
                src={imageUrl}
                alt="预览"
                className="w-full h-auto max-h-64 object-contain"
              />
            </div>

            <div className="flex gap-2 flex-wrap" data-slot="action-buttons">
              {onAnnotate && (
                <Button variant="outline" size="sm" onClick={onAnnotate}>
                  <Edit className="h-4 w-4" />
                  标注 {annotationCount > 0 && `(${annotationCount})`}
                </Button>
              )}
              {onCrop && (
                <Button variant="outline" size="sm" onClick={onCrop}>
                  <Crop className="h-4 w-4" />
                  裁剪 {hasCrop && '✓'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleUploadClick}>
                <Upload className="h-4 w-4" />
                重新上传
              </Button>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="space-y-2" data-slot="upload-progress">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              上传中... {uploadProgress}%
            </p>
          </div>
        )}
      </div>
    )
  }
)

ImageUploadPreview.displayName = "ImageUploadPreview"
