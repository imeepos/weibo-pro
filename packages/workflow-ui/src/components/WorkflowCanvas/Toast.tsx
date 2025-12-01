'use client'

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastProps {
  visible: boolean
  type: ToastType
  title: string
  message?: string
  duration?: number
  onClose: () => void
}

export function Toast({
  visible,
  type,
  title,
  message,
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!visible || duration <= 0) return

    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [visible, duration, onClose])

  if (!visible) return null

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  }

  const colors = {
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      icon: 'text-green-500',
      text: 'text-green-100',
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: 'text-red-500',
      text: 'text-red-100',
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      icon: 'text-blue-500',
      text: 'text-blue-100',
    },
  }

  const Icon = icons[type]
  const colorScheme = colors[type]

  const toastContent = (
    <div className="pointer-events-none absolute right-4 top-4 z-[10000] flex justify-end" style={{ zIndex: 10000 }}>
      <div
        className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border ${colorScheme.border} ${colorScheme.bg} p-4 shadow-2xl backdrop-blur-xl`}
        role="alert"
      >
        <Icon className={`h-5 w-5 flex-shrink-0 ${colorScheme.icon}`} strokeWidth={1.8} />
        <div className="flex-1">
          <h4 className={`text-sm font-semibold ${colorScheme.text}`}>{title}</h4>
          {message && (
            <p className="mt-1 text-sm text-[#9da6b9]">{message}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 rounded-lg p-1 text-[#9da6b9] transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(toastContent, document.body)
    : null
}
