'use client'

import { useRef } from 'react'
import { useUploadFile } from '@sker/ui/hooks/use-upload-file'

const FILE_TYPE_ERRORS = {
  image: '请选择图片文件',
  video: '请选择视频文件',
  audio: '请选择音频文件',
} as const

export type MediaFieldType = keyof typeof FILE_TYPE_ERRORS

export interface UseFileUploadFieldOptions {
  type: MediaFieldType
  uploadEndpoint?: string
  onChange: (value: any) => void
  onError: (error: string) => void
}

/**
 * 图片/视频/音频 通用的文件上传逻辑
 * 封装 useUploadFile hook + 文件类型校验 + 触发点击
 */
export function useFileUploadField({
  type,
  uploadEndpoint,
  onChange,
  onError,
}: UseFileUploadFieldOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isUploading, progress, uploadFile } = useUploadFile({
    endpoint: uploadEndpoint || '/api/upload/file',
    onSuccess: (file) => {
      onChange(file.url)
    },
    onError: (err) => {
      onError(err.message)
    }
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isMatch = file.type.startsWith(`${type}/`)
    if (!isMatch) {
      onError(FILE_TYPE_ERRORS[type])
      return
    }

    await uploadFile(file)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return { fileInputRef, isUploading, progress, handleFileChange, handleUploadClick }
}
