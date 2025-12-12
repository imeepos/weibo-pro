import React from 'react'
import { WeiboLoginAst } from '@sker/workflow-ast'

interface WeiboLoginAstPreviewProps {
  ast: WeiboLoginAst
}

/**
 * 微博登录预览组件
 *
 * 设计哲学：
 * - 聚焦本质：展示登录节点的核心输出（事件流与账号）
 * - 优雅简约：移除冗余，每个元素都有存在的理由
 * - 视觉叙事：通过状态指示讲述登录流程的故事
 */
export const WeiboLoginAstPreview: React.FC<WeiboLoginAstPreviewProps> = ({ ast }) => {
  const hasAccount = !!ast.account.value
  const isReady = hasAccount

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
              <h2 className="text-xl font-bold text-white">微博登录</h2>
              <p className="text-blue-100 text-sm">浏览器自动化登录与会话管理</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isReady
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
          }`}>
            {isReady ? '就绪' : '待启动'}
          </div>
        </div>
      </div>

      {/* 核心输出 */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 登录事件流 */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300 flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                登录事件流
              </h3>
            </div>
          </div>

          {/* 微博账号 */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                微博账号
              </h3>
              <div className={`w-3 h-3 rounded-full ${
                hasAccount ? 'bg-green-400' : 'bg-gray-400'
              }`}></div>
            </div>
            <p className="text-xs text-slate-400">
              {hasAccount ? '已获取账号信息，可用于后续节点' : '登录成功后将获取账号实体'}
            </p>
          </div>
        </div>

        {/* 账号详情（如果已获取） */}
        {ast.account.value && (
          <div className="mt-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4">
            <h4 className="text-green-300 text-sm font-medium mb-2">账号信息</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">用户名</span>
                <span className="text-white font-mono">{ast.account.value.weiboNickname || '未知'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">用户ID</span>
                <span className="text-white font-mono">{ast.account.value.weiboUid || '未知'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 使用提示 */}
        <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">💡</span>
            </div>
            <div>
              <h4 className="text-blue-300 text-sm font-medium mb-1">工作原理</h4>
              <p className="text-blue-200 text-sm">
                通过 Playwright 驱动浏览器完成微博登录。登录成功后，将账号信息传递给下游节点，实现自动化舆情采集。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部 */}
      <div className="bg-slate-800 border-t border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Weibo-Pro</span>
          <span>浏览器自动化</span>
        </div>
      </div>
    </div>
  );
};

WeiboLoginAstPreview.displayName = 'WeiboLoginAstPreview';