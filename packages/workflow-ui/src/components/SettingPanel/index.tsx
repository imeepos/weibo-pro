import React, { useState, useEffect } from 'react'
import { WeiboLoginSettingPanel } from './WeiboLoginSettingPanel'

interface SettingPanelProps {
  nodeId: string | null
  nodeData: any | null
  onClose: () => void
}

/**
 * 设置面板容器
 *
 * 优雅设计：
 * - 统一的设置面板入口
 * - 根据节点类型动态渲染对应的设置面板
 * - 支持双击节点展开配置
 */
export const SettingPanel: React.FC<SettingPanelProps> = ({
  nodeId,
  nodeData,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (nodeId && nodeData) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [nodeId, nodeData])

  if (!isVisible || !nodeId || !nodeData) {
    return null
  }

  const nodeClass = nodeData.nodeClass

  // 根据节点类型渲染对应的设置面板
  const renderSettingPanel = () => {
    switch (nodeClass) {
      case 'WeiboLoginAst':
        return (
          <WeiboLoginSettingPanel
            nodeId={nodeId}
            nodeData={nodeData}
            onClose={onClose}
          />
        )
      default:
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md">
              <h3 className="text-lg font-medium text-white mb-4">设置面板</h3>
              <p className="text-slate-300 mb-4">
                该节点类型暂不支持设置面板。
              </p>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                关闭
              </button>
            </div>
          </div>
        )
    }
  }

  return renderSettingPanel()
}

SettingPanel.displayName = 'SettingPanel'