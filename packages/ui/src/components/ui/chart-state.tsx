import { cn } from "@sker/ui/lib/utils"
import { Spinner } from "./spinner"
import { Button } from "./button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "./empty"
import { AlertCircle } from "lucide-react"

interface ChartStateProps {
  loading?: boolean
  error?: string
  empty?: boolean
  loadingText?: string
  emptyText?: string
  emptyDescription?: string
  onRetry?: () => void
  className?: string
  children?: React.ReactNode
}

function ChartState({
  loading,
  error,
  empty,
  loadingText = "加载数据中...",
  emptyText = "暂无数据",
  emptyDescription,
  onRetry,
  className,
  children,
}: ChartStateProps) {
  if (loading) {
    return (
      <div
        className={cn("flex items-center justify-center h-full", className)}
      >
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-8" />
          <p className="text-sm text-muted-foreground">{loadingText}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn("flex items-center justify-center h-full", className)}
      >
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircle className="size-6 text-destructive" />
            </EmptyMedia>
            <EmptyTitle>{error}</EmptyTitle>
            {onRetry && (
              <EmptyDescription>
                <Button onClick={onRetry} variant="outline" size="sm">
                  重新加载
                </Button>
              </EmptyDescription>
            )}
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  if (empty) {
    return (
      <div
        className={cn("flex items-center justify-center h-full", className)}
      >
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{emptyText}</EmptyTitle>
            {emptyDescription && (
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            )}
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return <>{children}</>
}

export { ChartState }
