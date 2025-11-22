'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, Workflow, Palette, FileText, Tag } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { WorkflowGraphAst } from '@sker/workflow'

export interface WorkflowSettingsDialogProps {
  visible: boolean
  workflow: WorkflowGraphAst
  onClose: () => void
  onSave: (settings: WorkflowSettings) => void
}

export interface WorkflowSettings {
  name?: string
  description?: string
  color?: string
  tags?: string[]
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

export function WorkflowSettingsDialog({
  visible,
  workflow,
  onClose,
  onSave,
}: WorkflowSettingsDialogProps) {
  const [name, setName] = useState(workflow.name || '')
  const [description, setDescription] = useState(workflow.description || '')
  const [color, setColor] = useState(workflow.groupColor || '#3b82f6')
  const [customColor, setCustomColor] = useState('')
  const [tags, setTags] = useState<string[]>(workflow.tags || [])
  const [newTag, setNewTag] = useState('')
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (visible) {
      setName(workflow.name || '')
      setDescription(workflow.description || '')
      setColor(workflow.groupColor || '#3b82f6')
      setCustomColor('')
      setTags(workflow.tags || [])
      setNewTag('')
    }
  }, [visible, workflow])


  const handleSave = useCallback(() => {
    // 验证名称
    if (!name.trim()) {
      setNameError('工作流名称不能为空')
      return
    }
    if (name.length > 50) {
      setNameError('工作流名称不能超过50个字符')
      return
    }

    setNameError('')
    onSave({
      name,
      description,
      color: customColor || color,
      tags,
    })
    onClose()
  }, [name, description, customColor, color, tags, onSave, onClose])

  const handleNameChange = (value: string) => {
    setName(value)
    // 实时验证
    if (!value.trim()) {
      setNameError('工作流名称不能为空')
    } else if (value.length > 50) {
      setNameError('工作流名称不能超过50个字符')
    } else {
      setNameError('')
    }
  }

  const handleAddTag = () => {
    const trimmedTag = newTag.trim()
    if (!trimmedTag) {
      return
    }
    if (tags.includes(trimmedTag)) {
      // 可以添加一个短暂的提示，但这里为了简洁暂时不实现
      return
    }
    if (tags.length >= 10) {
      // 限制标签数量
      return
    }
    setTags([...tags, trimmedTag])
    setNewTag('')
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  // 处理全局键盘事件
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && visible && name.trim()) {
        e.preventDefault()
        handleSave()
      }
    }

    if (visible) {
      document.addEventListener('keydown', handleGlobalKeyDown)
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown)
      }
    }
  }, [visible, name, onClose, handleSave])
  if (!visible) return null
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <Workflow className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">工作流设置</h2>
                <p className="text-xs text-slate-400">配置工作流的基本属性</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                'text-slate-400 hover:text-slate-100',
                'hover:bg-slate-800/50 active:bg-slate-700/50',
                'transition-colors'
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 内容 */}
          <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
            {/* 名称 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <FileText className="h-4 w-4 text-blue-400" />
                工作流名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="请输入工作流名称"
                className={cn(
                  'w-full rounded-lg border bg-slate-800/50 px-4 py-2.5',
                  'text-sm text-slate-100 placeholder-slate-500',
                  'focus:outline-none focus:ring-2 transition-colors',
                  nameError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
                )}
              />
              {nameError && (
                <p className="text-xs text-red-400">{nameError}</p>
              )}
            </div>

            {/* 简介 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <FileText className="h-4 w-4 text-indigo-400" />
                工作流简介
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入工作流简介（可选）"
                rows={4}
                className={cn(
                  'w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5',
                  'text-sm text-slate-100 placeholder-slate-500',
                  'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                  'transition-colors resize-none'
                )}
              />
            </div>

            {/* 颜色选择 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Palette className="h-4 w-4 text-purple-400" />
                主题颜色
              </label>

              {/* 预设颜色 */}
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    onClick={() => {
                      setColor(presetColor)
                      setCustomColor('')
                    }}
                    className={cn(
                      'h-10 w-10 rounded-lg transition-all',
                      color === presetColor && !customColor
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                        : 'hover:scale-105'
                    )}
                    style={{ backgroundColor: presetColor }}
                    title={presetColor}
                  />
                ))}
              </div>

              {/* 自定义颜色 */}
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={customColor || color}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded-lg border border-slate-700 bg-slate-800"
                />
                <span className="text-xs text-slate-400">
                  自定义颜色: {customColor || color}
                </span>
              </div>
            </div>

            {/* 标签 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Tag className="h-4 w-4 text-emerald-400" />
                标签（可选）
              </label>

              {/* 标签列表 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 添加标签输入框 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入标签后按回车添加"
                  className={cn(
                    'flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2',
                    'text-sm text-slate-100 placeholder-slate-500',
                    'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
                    'transition-colors'
                  )}
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    newTag.trim()
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
                      : 'cursor-not-allowed bg-slate-800 text-slate-600'
                  )}
                >
                  添加
                </button>
              </div>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-700/50 px-6 py-4">
            <button
              onClick={onClose}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium',
                'text-slate-300 hover:bg-slate-800/50 active:bg-slate-700/50',
                'transition-colors'
              )}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || !!nameError}
              className={cn(
                'rounded-lg px-6 py-2 text-sm font-medium transition-colors',
                name.trim() && !nameError
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                  : 'cursor-not-allowed bg-slate-800 text-slate-600'
              )}
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
