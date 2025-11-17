import React, { useState, useEffect } from 'react'
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
  const handleSave = () => {
    // 微博登录节点不再需要任何配置，自动生成匿名会话
  }

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
  const [isOpen, setIsOpen] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    // 监听二维码显示事件
    const handleQRCodeShow = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { image } = customEvent.detail;

      setQrImage(image);
      setIsOpen(true);
      setStatusMessage('请使用微博 App 扫描二维码');
    };

    // 监听登录状态更新事件
    const handleStatusUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { message } = customEvent.detail;

      setStatusMessage(message);

      // 如果登录成功或失败，3秒后自动关闭对话框
      if (message.includes('成功') || message.includes('失败') || message.includes('过期')) {
        setTimeout(() => {
          setIsOpen(false);
          setQrImage(null);
          setStatusMessage('');
        }, 3000);
      }
    };

    window.addEventListener('weibo-qrcode-show', handleQRCodeShow);
    window.addEventListener('weibo-login-status', handleStatusUpdate);

    return () => {
      window.removeEventListener('weibo-qrcode-show', handleQRCodeShow);
      window.removeEventListener('weibo-login-status', handleStatusUpdate);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative max-w-md rounded-lg bg-[#1a1d24] p-6 shadow-xl border border-[#282e39]">
        {/* 关闭按钮 */}
        <button
          onClick={() => {
            setIsOpen(false);
            setQrImage(null);
            setStatusMessage('');
          }}
          className="absolute right-4 top-4 text-[#9da6b9] hover:text-white transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 标题 */}
        <h2 className="mb-4 text-xl font-semibold text-white">微博扫码登录</h2>

        {/* 二维码 */}
        {qrImage && (
          <div className="mb-4 flex justify-center">
            <div className="rounded-lg bg-white p-4">
              <img
                src={`data:image/png;base64,${qrImage}`}
                alt="微博登录二维码"
                className="h-64 w-64"
              />
            </div>
          </div>
        )}

        {/* 状态消息 */}
        {statusMessage && (
          <div className="text-center">
            <p className="text-sm text-[#9da6b9]">{statusMessage}</p>
          </div>
        )}

        {/* 加载动画（当有状态消息但不是完成状态时显示） */}
        {statusMessage &&
         !statusMessage.includes('成功') &&
         !statusMessage.includes('失败') &&
         !statusMessage.includes('过期') && (
          <div className="mt-4 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#282e39] border-t-[#135bec]"></div>
          </div>
        )}

        {/* 提示信息 */}
        {!statusMessage.includes('成功') &&
         !statusMessage.includes('失败') &&
         !statusMessage.includes('过期') && (
          <div className="mt-4 rounded-md bg-[#282e39] p-3">
            <p className="text-xs text-[#6b7280]">
              💡 打开微博 App，扫描上方二维码即可登录
            </p>
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
