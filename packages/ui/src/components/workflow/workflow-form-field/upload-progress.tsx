'use client'

export interface UploadProgressProps {
  progress: number
}

/** 文件上传进度条 */
export function UploadProgress({ progress }: UploadProgressProps) {
  return (
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
  )
}
