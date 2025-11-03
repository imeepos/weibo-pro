'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { useNodeRegistry } from '../NodePalette/useNodeRegistry'
import type { NodeMetadata } from '../../types'
import type { Position } from './useContextMenu'

export interface NodeSelectorProps {
  visible: boolean
  position: Position
  onSelect: (metadata: NodeMetadata) => void
  onClose: () => void
}

export function NodeSelector({
  visible,
  position,
  onSelect,
  onClose,
}: NodeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const nodeRegistry = useNodeRegistry()

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return nodeRegistry
    }
    const query = searchQuery.toLowerCase()
    return nodeRegistry.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.type.toLowerCase().includes(query)
    )
  }, [nodeRegistry, searchQuery])

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [visible])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  useEffect(() => {
    if (!visible) {
      setSearchQuery('')
      setSelectedIndex(0)
    }
  }, [visible])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (visible && !target.closest('.node-selector')) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) =>
          prev < filteredNodes.length - 1 ? prev + 1 : prev
        )
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (filteredNodes[selectedIndex]) {
          handleSelect(filteredNodes[selectedIndex])
        }
      }
    }

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [visible, onClose, filteredNodes, selectedIndex])

  const handleSelect = (metadata: NodeMetadata) => {
    onSelect(metadata)
    onClose()
  }

  if (!visible) {
    return null
  }

  const selectorContent = (
    <div
      className="node-selector min-w-[18rem] max-w-lg rounded-xl border border-[#3b4354] bg-[#111318] shadow-2xl shadow-black/40 backdrop-blur-xl"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
      }}
    >
      <div className="px-4 pt-3 pb-2">
        <label className="flex items-center gap-2 rounded-lg border border-[#2a3140] bg-[#1a1d24] px-3 py-2 focus-within:border-[#135bec] focus-within:ring-2 focus-within:ring-[#135bec]/30">
          <Search className="h-4 w-4 text-[#6c7a91]" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索节点..."
            className="flex-1 border-none bg-transparent text-sm text-white placeholder-[#6c7a91] focus:outline-none"
          />
        </label>
      </div>

      <div className="max-h-80 overflow-x-hidden overflow-y-auto px-2 pb-2">
        {filteredNodes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#3b4354] bg-[#1a1d24] px-4 py-8 text-center text-sm text-[#6c7a91]">
            {searchQuery ? '未找到匹配的节点' : '暂无可用节点'}
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-2 pt-1">
            {filteredNodes.map((metadata, index) => (
              <button
                key={metadata.type}
                type="button"
                className={`flex w-full items-center justify-between gap-4 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                  index === selectedIndex
                    ? 'border-[#135bec] bg-[#1f2531] text-white shadow-[0_0_12px_rgba(19,91,236,0.25)]'
                    : 'border-transparent bg-[#1a1d24] text-[#e2e8f0] hover:border-[#2f3a4c] hover:bg-[#202531]'
                }`}
                onClick={() => handleSelect(metadata)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1f2531] text-sm font-semibold text-[#9da6b9]">
                    {metadata.label.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {metadata.label}
                    </span>
                    <span className="text-xs text-[#6c7a91]">{metadata.type}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 text-xs text-[#9da6b9]">
                  {metadata.inputs.length > 0 && (
                    <span className="rounded-full border border-[#2f3a4c] bg-[#1f2531] px-2 py-0.5">
                      入 {metadata.inputs.length}
                    </span>
                  )}
                  {metadata.outputs.length > 0 && (
                    <span className="rounded-full border border-[#2f3a4c] bg-[#1f2531] px-2 py-0.5">
                      出 {metadata.outputs.length}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[#3b4354] bg-[#111318] px-4 py-2 text-xs text-[#7a8299]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[#2a3140] bg-[#1a1d24] px-1.5 py-0.5 text-[10px] font-semibold text-[#cbd5f5]">
                ↑↓
              </kbd>
              <span>选择</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[#2a3140] bg-[#1a1d24] px-1.5 py-0.5 text-[10px] font-semibold text-[#cbd5f5]">
                Enter
              </kbd>
              <span>确认</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[#2a3140] bg-[#1a1d24] px-1.5 py-0.5 text-[10px] font-semibold text-[#cbd5f5]">
                ESC
              </kbd>
              <span>关闭</span>
            </span>
          </div>
          {filteredNodes.length > 0 && (
            <span className="whitespace-nowrap text-xs text-[#9da6b9]">
              {filteredNodes.length} 个节点
            </span>
          )}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(selectorContent, document.body)
    : null
}
