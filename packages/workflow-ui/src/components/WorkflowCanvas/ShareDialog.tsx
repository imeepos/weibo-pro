'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check, Share2 } from 'lucide-react'

export interface ShareDialogProps {
  visible: boolean
  shareUrl: string
  onClose: () => void
}

export function ShareDialog({ visible, shareUrl, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState(false)

  if (!visible) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败', error)
    }
  }

  const dialogContent = (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#2f3543] bg-[#111318] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f2531] text-[#135bec]">
              <Share2 className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <h3 className="text-lg font-semibold text-white">分享工作流</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9da6b9] transition hover:bg-[#1f2531] hover:text-white"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-[#9da6b9]">
            分享链接
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm text-white focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg bg-[#135bec] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b6aff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#135bec] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={2} />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" strokeWidth={1.8} />
                  <span>复制</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-sm text-[#6c7a91]">
          任何拥有此链接的人都可以查看该工作流
        </p>
      </div>
    </>
  )

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : null
}
