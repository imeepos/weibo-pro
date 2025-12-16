import React, { useState, useEffect } from 'react'
import { WeiboLoginAst } from '@sker/workflow-ast'
import { InlineExecutor } from '../components/execution/InlineExecutor'
import { Preview, Render, Setting } from '@sker/workflow'
import { Injectable } from '@sker/core'
import type { WeiboAccountEntity } from '@sker/entities'

// 微博登录预览组件
const WeiboLoginPreview = ({ ast }: { ast: WeiboLoginAst }) => {
  return (
    <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50 rounded border border-slate-600 p-2">
      <div className="text-lg">🔐</div>
      <div className="text-xs text-slate-300 mt-1">
        微博扫码登录
      </div>
      <div className="text-[10px] text-slate-400 mt-1">
        自动生成匿名会话
      </div>
    </div>
  );
};

// 设置表单组件
export const WeiboLoginSetting = ({ ast }: { ast: WeiboLoginAst }) => {
  return (
    <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-4">微博登录配置</h3>

      <div className="space-y-4">
        <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
          <div className="flex items-center mb-2">
            <div className="text-blue-400 mr-2">ℹ️</div>
            <h4 className="text-sm font-medium text-slate-200">节点说明</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            微博登录节点会自动生成匿名会话，无需配置任何参数。执行时会弹出二维码，用户扫码即可完成登录。
          </p>
        </div>

        <div className="bg-yellow-900/30 p-4 rounded-lg border border-yellow-600/50">
          <div className="flex items-center mb-2">
            <div className="text-yellow-400 mr-2">⚠️</div>
            <h4 className="text-sm font-medium text-slate-200">注意事项</h4>
          </div>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• 确保网络环境可以正常访问微博</li>
            <li>• 二维码有效期为5分钟，超时需重新执行</li>
            <li>• 登录成功后会自动保存账号信息</li>
            <li>• 每个匿名会话都是独立的登录流程</li>
          </ul>
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

/**
 * 微博登录二维码渲染组件
 *
 * 优雅设计：
 * - 监听 Handler 触发的自定义事件
 * - 自动显示/隐藏二维码
 * - 显示登录状态消息
 */
const WeiboLoginRender: React.FC<{ ast: WeiboLoginAst }> = ({ ast }) => {

  // 调试日志
  useEffect(() => {
    console.log('[WeiboLoginRender] ast.qrcode 更新:', ast.qrcode);
    console.log('[WeiboLoginRender] ast.message 更新:', ast.message);
    console.log('[WeiboLoginRender] ast.state 更新:', ast.state);
  }, [ast.qrcode, ast.message, ast.state]);

  if (ast.state === 'pending') return null;

  return (
    <div className="p-4 flex flex-col items-center justify-center space-y-3">
      {/* 显示二维码 */}
      {ast.qrcode && (
        <div className="flex flex-col items-center">
          <img
            src={ast.qrcode}
            alt="微博登录二维码"
            className="w-48 h-48 rounded-lg border border-slate-600"
          />
          <p className="text-xs text-slate-400 mt-2">请使用微博 App 扫码登录</p>
        </div>
      )}

      {/* 显示提示消息 */}
      {ast.message && (
        <div className={`text-sm px-3 py-2 rounded ${
          ast.state === 'success'
            ? 'bg-green-900/30 text-green-400 border border-green-600/50'
            : ast.state === 'fail'
            ? 'bg-red-900/30 text-red-400 border border-red-600/50'
            : 'bg-blue-900/30 text-blue-400 border border-blue-600/50'
        }`}>
          {ast.message}
        </div>
      )}

      {/* 运行中但无二维码时显示加载状态 */}
      {ast.state === 'running' && !ast.qrcode && !ast.message && (
        <div className="flex items-center space-x-2 text-slate-400">
          <div className="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full"></div>
          <span className="text-sm">正在获取二维码...</span>
        </div>
      )}
    </div>
  );
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
