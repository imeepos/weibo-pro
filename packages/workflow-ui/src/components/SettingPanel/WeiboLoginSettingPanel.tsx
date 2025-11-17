import React, { useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'
import { WeiboLoginAst } from '@sker/workflow-ast'
import { WeiboLoginSetting } from '../../renderers/WeiboLoginAstRender'
import { InlineExecutor } from '../execution/InlineExecutor'

interface WeiboLoginSettingPanelProps {
  nodeId: string
  nodeData: any
  onClose: () => void
}

/**
 * 微博登录设置面板
 *
 * 优雅设计：
 * - 独立的设置面板，支持双击节点展开
 * - 完整的配置表单和运行功能
 * - 精美的视觉设计
 */
export const WeiboLoginSettingPanel: React.FC<WeiboLoginSettingPanelProps> = ({
  nodeId,
  nodeData,
  onClose
}) => {
  const { setNodes } = useReactFlow()
  const [ast, setAst] = useState<WeiboLoginAst>(nodeData.ast)

  const handleAstUpdate = (updatedAst: WeiboLoginAst) => {
    setAst(updatedAst)

    // 更新节点数据
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ast: updatedAst } }
          : node
      )
    )
  }

  const handleExecute = (result: any) => {
    console.log('微博登录执行完成:', result)
    // 可以在这里添加执行完成后的处理逻辑
  }

  const handleError = (error: Error) => {
    console.error('微博登录执行失败:', error)
    // 可以在这里添加错误处理逻辑
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xl">🔐</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">微博登录配置</h2>
                <p className="text-blue-100 text-sm">节点: {nodeId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* 配置表单 */}
          <div className="mb-6">
            <WeiboLoginSetting ast={ast} />
          </div>

          {/* 执行器 */}
          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
              节点执行
            </h3>
            <InlineExecutor
              ast={ast}
              executorName="微博登录"
              onComplete={handleExecute}
              onError={handleError}
              className="bg-slate-800 border border-slate-600 rounded-lg"
            />
          </div>

          {/* 当前配置预览 */}
          <div className="mt-6 bg-slate-700/30 rounded-lg p-4 border border-slate-600">
            <h3 className="text-md font-medium text-white mb-3">节点信息</h3>
            <div className="text-sm text-slate-300 space-y-2">
              <div className="flex justify-between">
                <span>节点类型:</span>
                <span className="font-mono">{ast.type}</span>
              </div>
              <div className="flex justify-between">
                <span>执行状态:</span>
                <span className="font-mono">{ast.state || '未执行'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
            >
              关闭
            </button>
            <button
              onClick={() => {
                // 可以添加保存到工作流的逻辑
                console.log('保存配置:', ast)
                onClose()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              保存并关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

WeiboLoginSettingPanel.displayName = 'WeiboLoginSettingPanel';