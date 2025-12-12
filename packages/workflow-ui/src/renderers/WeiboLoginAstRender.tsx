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

  if (ast.state === 'pending') return null;

  return (
    <div className="z-50 flex items-center justify-center">
      <div className="relative max-w-md rounded-lg py-4">
        {(ast.qrcode && !ast.account) && (
          <div className="flex justify-center">
            <div className="rounded-lg">
              <img
                src={
                  ast.qrcode.startsWith('http://') || ast.qrcode.startsWith('https://')
                    ? ast.qrcode
                    : `data:image/png;base64,${ast.qrcode}`
                }
                alt="微博登录二维码"
                className="h-full w-full"
              />
            </div>
          </div>
        )}

        {ast.account.value && (
          <div className="flex flex-row items-center">
            <img
              src={ast.account.value.weiboAvatar}
              alt={ast.account.value.weiboNickname}
              className="h-8 w-8 rounded-full border-2 border-white shadow-lg object-cover"
            />
            <div className="ml-4">{ast.account.value.weiboNickname}</div>
          </div>
        )}

        {/* 状态消息 */}
        {(ast.message && !ast.account.value) && (
          <div className="text-center mt-2">
            <p className="text-sm text-muted-foreground">{ast.message}</p>
          </div>
        )}
      </div>
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
