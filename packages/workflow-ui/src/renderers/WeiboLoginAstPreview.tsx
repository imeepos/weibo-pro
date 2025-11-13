import React from 'react'
import { WeiboLoginAst } from '@sker/workflow-ast'

interface WeiboLoginAstPreviewProps {
  ast: WeiboLoginAst
}

/**
 * 微博登录预览组件
 *
 * 优雅设计：
 * - 精美的视觉展示，适合发布后展示
 * - 清晰的状态指示和配置信息
 * - 响应式设计，适配不同屏幕尺寸
 */
export const WeiboLoginAstPreview: React.FC<WeiboLoginAstPreviewProps> = ({ ast }) => {
  const hasConfig = ast.userId || ast.sessionId
  const isConfigured = ast.userId && ast.sessionId

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔐</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">微博登录节点</h2>
              <p className="text-blue-100 text-sm">安全认证与账号管理</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isConfigured
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : hasConfig
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
          }`}>
            {isConfigured ? '已配置' : hasConfig ? '部分配置' : '未配置'}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 配置信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              用户配置
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">用户ID</span>
                <span className="text-white font-mono text-sm">
                  {ast.userId || <span className="text-slate-500">未设置</span>}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">会话状态</span>
                <span className={`text-sm font-medium ${
                  ast.sessionId
                    ? 'text-green-400'
                    : 'text-slate-500'
                }`}>
                  {ast.sessionId ? '已登录' : '未登录'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              输出信息
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">登录事件流</span>
                <span className={`text-sm ${
                  ast.events$ ? 'text-green-400' : 'text-slate-500'
                }`}>
                  {ast.events$ ? '活跃' : '未激活'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">账号信息</span>
                <span className={`text-sm ${
                  ast.account ? 'text-green-400' : 'text-slate-500'
                }`}>
                  {ast.account ? '已获取' : '未获取'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 状态指示器 */}
        <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
            <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
            节点状态
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  ast.userId ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                }`}></div>
                <span className="text-slate-300 text-sm">用户配置</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  ast.sessionId ? 'bg-green-400' : 'bg-gray-400'
                }`}></div>
                <span className="text-slate-300 text-sm">会话状态</span>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              最后更新: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* 操作指南 */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">💡</span>
            </div>
            <div>
              <h4 className="text-blue-300 text-sm font-medium mb-1">使用说明</h4>
              <p className="text-blue-200 text-sm">
                双击节点可配置用户ID和会话信息。配置完成后，点击运行按钮启动微博登录流程。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部装饰 */}
      <div className="bg-slate-800 border-t border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>微博舆情分析平台</span>
          <span>Weibo-Pro</span>
        </div>
      </div>
    </div>
  );
};

WeiboLoginAstPreview.displayName = 'WeiboLoginAstPreview';