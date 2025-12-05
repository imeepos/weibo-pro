import { useState, useCallback } from 'react'

interface UploadedFile {
  url: string
  name: string
}

interface UseUploadFileOptions {
  endpoint?: string
  onSuccess?: (file: UploadedFile) => void
  onError?: (error: Error) => void
}

interface UseUploadFileReturn {
  isUploading: boolean
  progress: number
  uploadedFile: UploadedFile | null
  uploadFile: (file: File) => Promise<void>
  uploadingFile: File | null
}

export function useUploadFile(
  options: UseUploadFileOptions = {}
): UseUploadFileReturn {
  const { endpoint, onSuccess, onError } = options

  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [uploadingFile, setUploadingFile] = useState<File | null>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true)
      setUploadingFile(file)
      setProgress(0)
      setUploadedFile(null)

      try {
        if (endpoint) {
          // 使用 XMLHttpRequest 支持上传进度
          await new Promise<UploadedFile>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            const formData = new FormData()
            formData.append('file', file)

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100
                setProgress(Math.round(percentComplete))
              }
            })

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText)
                  // 处理后端响应格式 {success: true, data: {url, name}}
                  const result = response.data || response
                  resolve(result)
                } catch {
                  reject(new Error('上传响应解析失败'))
                }
              } else {
                reject(new Error(`上传失败: ${xhr.statusText}`))
              }
            })

            xhr.addEventListener('error', () => {
              reject(new Error('上传请求失败'))
            })

            xhr.open('POST', endpoint)
            xhr.send(formData)
          }).then((result) => {
            setUploadedFile(result)
            onSuccess?.(result)
          })
        } else {
          // 本地预览模式（用于开发和演示）
          const objectUrl = URL.createObjectURL(file)

          // 模拟上传进度
          for (let i = 0; i <= 100; i += 10) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            setProgress(i)
          }

          const result: UploadedFile = {
            url: objectUrl,
            name: file.name,
          }

          setUploadedFile(result)
          onSuccess?.(result)
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('上传失败')
        console.error('文件上传失败:', err)
        onError?.(err)
      } finally {
        setIsUploading(false)
      }
    },
    [endpoint, onSuccess, onError]
  )

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile,
    uploadingFile,
  }
}

