'use client'

import React from 'react'
import { X, Workflow, Palette, FileText, Tag, Loader2 } from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

export interface WorkflowSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  description: string
  color: string
  customColor: string
  tags: string[]
  newTag: string
  nameError?: string
  saving: boolean
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onColorChange: (color: string) => void
  onCustomColorChange: (color: string) => void
  onTagInputChange: (value: string) => void
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  onSave: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
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
  open,
  onOpenChange,
  name,
  description,
  color,
  customColor,
  tags,
  newTag,
  nameError,
  saving,
  onNameChange,
  onDescriptionChange,
  onColorChange,
  onCustomColorChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onSave,
  onKeyDown,
}: WorkflowSettingsDialogProps) {
  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
        <DialogContent
          showCloseButton={false}
          className="max-w-2xl bg-slate-900/95 border-slate-700/50 p-0 gap-0 shadow-2xl backdrop-blur-xl"
        >
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
              onClick={() => onOpenChange(false)}
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
              <Label className="text-slate-300">
                <FileText className="h-4 w-4 text-blue-400" />
                工作流名称
              </Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="请输入工作流名称"
                aria-invalid={!!nameError}
                className={cn(
                  'bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500',
                  nameError && 'border-red-500'
                )}
              />
              {nameError && (
                <p className="text-xs text-red-400">{nameError}</p>
              )}
            </div>

            {/* 简介 */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                <FileText className="h-4 w-4 text-indigo-400" />
                工作流简介
              </Label>
              <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
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
              <Label className="text-slate-300">
                <Palette className="h-4 w-4 text-purple-400" />
                主题颜色
              </Label>

              {/* 预设颜色 */}
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    onClick={() => onColorChange(presetColor)}
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
                  onChange={(e) => onCustomColorChange(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded-lg border border-slate-700 bg-slate-800"
                />
                <span className="text-xs text-slate-400">
                  自定义颜色: {customColor || color}
                </span>
              </div>
            </div>

            {/* 标签 */}
            <div className="space-y-3">
              <Label className="text-slate-300">
                <Tag className="h-4 w-4 text-emerald-400" />
                标签（可选）
              </Label>

              {/* 标签列表 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-slate-800 text-slate-300 border-slate-700 gap-1.5"
                    >
                      {tag}
                      <button
                        onClick={() => onRemoveTag(tag)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* 添加标签输入框 */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newTag}
                  onChange={(e) => onTagInputChange(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="输入标签后按回车添加"
                  className="flex-1 bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500"
                />
                <Button
                  onClick={onAddTag}
                  disabled={!newTag.trim()}
                  variant={newTag.trim() ? 'default' : 'outline'}
                  className={cn(
                    newTag.trim()
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                      : 'cursor-not-allowed bg-slate-800 text-slate-600'
                  )}
                >
                  添加
                </Button>
              </div>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-700/50 px-6 py-4">
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="text-slate-300 hover:bg-slate-800/50"
            >
              取消
            </Button>
            <Button
              onClick={onSave}
              disabled={!name.trim() || !!nameError || saving}
              className={cn(
                'flex items-center gap-2',
                name.trim() && !nameError && !saving
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  : 'cursor-not-allowed bg-slate-800 text-slate-600'
              )}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

export { PRESET_COLORS }
