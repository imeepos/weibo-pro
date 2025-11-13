import React, { useState } from 'react'
import { WeiboLoginAst } from '@sker/workflow-ast'
import { InlineExecutor } from '../components/execution/InlineExecutor'
import { Preview, Render, Setting } from '@sker/workflow'
import { Injectable } from '@sker/core'

// 微博登录预览组件
const WeiboLoginPreview = ({ ast }: { ast: WeiboLoginAst }) => {
  return (
    <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50 rounded border border-slate-600 p-2">
      <div className="text-lg">🔐</div>
      <div className="text-xs text-slate-300 mt-1">
        {ast.userId ? `用户: ${ast.userId}` : '未配置'}
      </div>
      {ast.sessionId && (
        <div className="text-[10px] text-slate-400 mt-1">
          会话: {ast.sessionId.substring(0, 8)}...
        </div>
      )}
    </div>
  );
};

// 设置表单组件
const WeiboLoginSetting = ({ ast }: { ast: WeiboLoginAst }) => {
  const [userId, setUserId] = useState(ast.userId || '')
  const [sessionId, setSessionId] = useState(ast.sessionId || '')

  const handleSave = () => {
    ast.userId = userId
    ast.sessionId = sessionId || undefined
  }

  return (
    <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-4">微博登录配置</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            用户ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入微博用户ID"
          />
          <p className="mt-1 text-xs text-slate-400">
            微博用户的唯一标识符
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            会话ID (可选)
          </label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入会话ID"
          />
          <p className="mt-1 text-xs text-slate-400">
            已有会话ID，留空则创建新会话
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            保存配置
          </button>
          <button
            onClick={() => {
              setUserId('')
              setSessionId('')
            }}
            className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            重置
          </button>
        </div>
      </div>

      {/* 执行器区域 */}
      <div className="mt-6 pt-4 border-t border-slate-600">
        <h4 className="text-md font-medium text-white mb-3">节点执行</h4>
        <InlineExecutor
          ast={ast}
          executorName="微博登录"
          onComplete={(result) => {
            console.log('微博登录执行完成:', result)
          }}
          onError={(error) => {
            console.error('微博登录执行失败:', error)
          }}
        />
      </div>
    </div>
  );
};

const WeiboLoginRender: React.FC<{ ast: WeiboLoginAst }> = (ast) => {
  return <div>微博登录</div>
}

@Injectable()
export class WeiboLoginAstRender {

  @Render(WeiboLoginAst)
  render(ast: WeiboLoginAst) {
    return <WeiboLoginRender ast={ast} />
  }

  @Setting(WeiboLoginAst)
  setting(ast: WeiboLoginAst) {
    return <WeiboLoginSetting ast={ast} />
  }

  @Preview(WeiboLoginAst)
  preview(ast: WeiboLoginAst) {
    return <WeiboLoginPreview ast={ast} />
  }
}
