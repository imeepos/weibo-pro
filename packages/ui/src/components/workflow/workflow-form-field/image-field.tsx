'use client'

import { useState } from 'react'
import { cn } from '@udecode/cn'
import { ImageEditor } from '@sker/ui/components/ui/image-editor'
import type { Annotation, CropArea } from '@sker/ui/components/ui/image-editor'
import { Button } from '@sker/ui/components/ui/button'
import { X } from 'lucide-react'
import { useFileUploadField } from './use-file-upload-field'
import { UploadTriggerButton } from './upload-trigger-button'
import { UploadProgress } from './upload-progress'

export interface ImageFieldProps {
  value: any
  onChange: (value: any) => void
  placeholder?: string
  disabled?: boolean
  uploadEndpoint?: string
  setError: (error: string | null) => void
}

/** 图片上传/预览/标注字段（image） */
export function ImageField({
  value,
  onChange,
  placeholder,
  disabled = false,
  uploadEndpoint,
  setError,
}: ImageFieldProps) {
  const [showEditor, setShowEditor] = useState(false)
  const [imageAnnotations, setImageAnnotations] = useState<Annotation[]>([])
  const [imageCropArea, setImageCropArea] = useState<CropArea | null>(null)

  const { fileInputRef, isUploading, progress, handleFileChange, handleUploadClick } = useFileUploadField({
    type: 'image',
    uploadEndpoint,
    onChange,
    onError: setError,
  })

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
        <UploadTriggerButton
          placeholder={placeholder || '上传图片'}
          disabled={disabled}
          onClick={handleUploadClick}
          className="w-32 h-32"
        />
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

      {isUploading && <UploadProgress progress={progress} />}

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
}
