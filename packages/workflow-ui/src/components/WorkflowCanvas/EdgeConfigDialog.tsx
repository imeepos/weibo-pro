import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { EdgeMode, type IEdge } from '@sker/workflow'
import { EDGE_MODE_STYLES } from '../../types/edge.types'
import { EdgePreview } from './EdgePreview'

export interface EdgeConfigDialogProps {
  visible: boolean
  edge: IEdge | null
  onClose: () => void
  onSave: (edgeConfig: Partial<IEdge>) => void
}

/**
 * 边配置对话框
 *
 * 优雅设计：
 * - 场景化选择：每个模式都有清晰的说明和适用场景
 * - 最小化字段：只显示当前模式需要的配置
 * - 实时预览：底部显示边的视觉效果
 */
export function EdgeConfigDialog({
  visible,
  edge,
  onClose,
  onSave
}: EdgeConfigDialogProps) {
  const [mode, setMode] = useState<EdgeMode>(EdgeMode.MERGE)
  const [fromProperty, setFromProperty] = useState('')
  const [toProperty, setToProperty] = useState('')
  const [weight, setWeight] = useState(1)
  const [isPrimary, setIsPrimary] = useState(false)

  useEffect(() => {
    if (edge) {
      setMode(edge.mode || EdgeMode.MERGE)
      setFromProperty(edge.fromProperty || '')
      setToProperty(edge.toProperty || '')
      setWeight(edge.weight || 1)
      setIsPrimary(edge.isPrimary || false)
    }
  }, [edge])

  if (!visible || !edge) return null

  const handleSave = () => {
    const config: Partial<IEdge> = {
      mode,
      fromProperty: fromProperty || undefined,
      toProperty: toProperty || undefined,
      weight,
    }

    if (mode === EdgeMode.WITH_LATEST_FROM) {
      config.isPrimary = isPrimary
    }

    onSave(config)
    onClose()
  }

  const modes = [
    { key: EdgeMode.MERGE, config: EDGE_MODE_STYLES.merge },
    { key: EdgeMode.ZIP, config: EDGE_MODE_STYLES.zip },
    { key: EdgeMode.COMBINE_LATEST, config: EDGE_MODE_STYLES.combineLatest },
    { key: EdgeMode.WITH_LATEST_FROM, config: EDGE_MODE_STYLES.withLatestFrom },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-[#282e39] bg-[#111318] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#282e39] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">边配置</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-white">模式选择</label>
            <div className="space-y-2">
              {modes.map(({ key, config }) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    mode === key
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#282e39] hover:border-[#3b4354]'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={key}
                    checked={mode === key}
                    onChange={() => setMode(key)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <span className="font-medium text-white">{config.label}</span>
                      <span className="text-sm text-[#9da6b9]">{config.description}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#6b7280]">适用：{config.scenario}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {mode === EdgeMode.WITH_LATEST_FROM && (
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-white">标记为主流</span>
              </label>
              <p className="text-xs text-[#6b7280]">主流触发时，会携带其他辅流的最新值</p>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium text-white">数据映射</label>
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-xs text-[#9da6b9]">源属性</label>
                <input
                  type="text"
                  value={fromProperty}
                  onChange={(e) => setFromProperty(e.target.value)}
                  placeholder="例如: currentItem.text"
                  className="w-full rounded-md border border-[#282e39] bg-[#1a1d24] px-3 py-2 text-sm text-white placeholder-[#6b7280] focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9da6b9]">目标属性</label>
                <input
                  type="text"
                  value={toProperty}
                  onChange={(e) => setToProperty(e.target.value)}
                  placeholder="例如: content"
                  className="w-full rounded-md border border-[#282e39] bg-[#1a1d24] px-3 py-2 text-sm text-white placeholder-[#6b7280] focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9da6b9]">权重</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full rounded-md border border-[#282e39] bg-[#1a1d24] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">预览</label>
            <EdgePreview mode={mode} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#282e39] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm text-white transition hover:bg-blue-600"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
