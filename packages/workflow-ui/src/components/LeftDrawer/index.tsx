'use client'

import React from 'react'
import { PropertyPanel } from '../PropertyPanel'
import { cn } from '../../utils/cn'

export interface LeftDrawerProps {
  visible: boolean
  onClose: () => void
  className?: string
}

export function LeftDrawer({ visible, onClose, className = '' }: LeftDrawerProps) {
  return (
    <>
      {/* 遮罩层 */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity duration-300 z-40',
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* 左侧抽屉 */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full w-96 bg-[#111318] border-r border-[#282e39] shadow-2xl z-50',
          'transition-transform duration-300 ease-in-out',
          visible ? 'translate-x-0' : '-translate-x-full',
          'flex flex-col',
          className
        )}
      >
        {/* 抽屉头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#282e39]">
          <h2 className="text-lg font-semibold text-white">节点属性</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 抽屉内容 */}
        <div className="flex-1 overflow-y-auto">
          <PropertyPanel />
        </div>
      </div>
    </>
  )
}
