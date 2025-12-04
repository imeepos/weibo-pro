import * as React from "react"
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  StopCircle,
  type LucideIcon
} from "lucide-react"

import { cn } from "@sker/ui/lib/utils"

export type StatusType =
  | "success"
  | "error"
  | "running"
  | "pending"
  | "timeout"
  | "cancelled"

const statusIconMap: Record<StatusType, { icon: LucideIcon; className: string }> = {
  success: {
    icon: CheckCircle2,
    className: "text-green-400"
  },
  error: {
    icon: XCircle,
    className: "text-red-400"
  },
  running: {
    icon: RefreshCw,
    className: "text-blue-400 animate-spin"
  },
  pending: {
    icon: Clock,
    className: "text-gray-400"
  },
  timeout: {
    icon: AlertCircle,
    className: "text-yellow-400"
  },
  cancelled: {
    icon: StopCircle,
    className: "text-orange-400"
  },
}

export interface StatusIconProps extends React.ComponentProps<LucideIcon> {
  status: StatusType
  size?: number
}

function StatusIcon({
  status,
  className,
  strokeWidth = 2,
  size,
  ...props
}: StatusIconProps) {
  const config = statusIconMap[status]
  const Icon = config.icon

  return (
    <Icon
      className={cn("h-5 w-5", config.className, className)}
      strokeWidth={strokeWidth}
      size={size}
      {...props}
    />
  )
}

export { StatusIcon }
