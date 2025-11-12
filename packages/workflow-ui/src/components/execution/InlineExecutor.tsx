import React, { useState, useEffect, useCallback } from 'react'
import { Ast } from '@sker/workflow'
import { ExecutorManager } from '../../execution/executor-registry'
import { cn } from '../../utils/cn'

interface InlineExecutorProps {
  /** 要执行的AST节点 */
  ast: Ast
  /** 执行器名称 */
  executorName?: string
  /** 是否自动执行 */
  autoExecute?: boolean
  /** 执行完成回调 */
  onComplete?: (result: Ast) => void
  /** 执行失败回调 */
  onError?: (error: Error) => void
  /** 自定义样式 */
  className?: string
}

/**
 * 内联执行器组件
 * 在节点内部直接嵌入执行界面
 */
export const InlineExecutor: React.FC<InlineExecutorProps> = ({
  ast,
  executorName,
  autoExecute = false,
  onComplete,
  onError,
  className
}) => {
  const [isExecuting, setIsExecuting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<Ast | null>(null)

  // 自动执行
  useEffect(() => {
    if (autoExecute && !isExecuting && !result && !error) {
      executeNode()
    }
  }, [autoExecute, isExecuting, result, error])

  const executeNode = useCallback(async () => {
    if (isExecuting) return

    setIsExecuting(true)
    setProgress(0)
    setStatusMessage('准备执行')
    setError(null)

    try {
      const executionResult = await ExecutorManager.executeNode(ast, {
        onStateChange: (state, error) => {
          if (state === 'fail' && error) {
            setError(error)
            onError?.(error)
          }
        },
        onProgress: (currentProgress, message) => {
          setProgress(currentProgress)
          setStatusMessage(message || '')
        },
        onResult: (resultData) => {
          setResult(ast) // AST本身会被更新
        }
      })

      setResult(executionResult)
      onComplete?.(executionResult)

    } catch (err) {
      const executionError = err instanceof Error ? err : new Error(String(err))
      setError(executionError)
      onError?.(executionError)
    } finally {
      setIsExecuting(false)
    }
  }, [ast, isExecuting, onComplete, onError])

  const resetExecution = () => {
    setIsExecuting(false)
    setProgress(0)
    setStatusMessage('')
    setError(null)
    setResult(null)
  }

  const renderStatus = () => {
    if (error) {
      return (
        <div className="text-red-400 text-xs">
          <div className="font-medium">执行失败</div>
          <div className="mt-1">{error.message}</div>
          <button
            onClick={resetExecution}
            className="mt-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            重试
          </button>
        </div>
      )
    }

    if (result) {
      return (
        <div className="text-green-400 text-xs">
          <div className="font-medium">执行成功</div>
          <button
            onClick={resetExecution}
            className="mt-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            重新执行
          </button>
        </div>
      )
    }

    if (isExecuting) {
      return (
        <div className="text-blue-400 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span>执行中...</span>
          </div>
          {progress > 0 && (
            <div className="mt-1">
              <div className="w-full bg-gray-600 rounded-full h-1">
                <div
                  className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1 text-gray-400">
                {statusMessage || `进度: ${progress}%`}
              </div>
            </div>
          )}
          <button
            onClick={() => setIsExecuting(false)}
            className="mt-2 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
            disabled={!isExecuting}
          >
            取消
          </button>
        </div>
      )
    }

    return (
      <div className="text-gray-400 text-xs">
        <div className="font-medium">
          {executorName || '执行器'}
        </div>
        <button
          onClick={executeNode}
          className="mt-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          执行节点
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      'p-3 bg-slate-800 border border-slate-600 rounded-lg',
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-white">
          节点执行器
        </h4>
        <div className="text-xs text-gray-400">
          {ast.constructor.name}
        </div>
      </div>

      {renderStatus()}

      {/* 执行参数预览 */}
      {!isExecuting && !result && !error && (
        <div className="mt-3 pt-2 border-t border-slate-600">
          <div className="text-xs text-gray-400 mb-1">执行参数:</div>
          <div className="text-xs text-gray-300 max-h-20 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(ast, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 执行结果预览 */}
      {result && (
        <div className="mt-3 pt-2 border-t border-slate-600">
          <div className="text-xs text-gray-400 mb-1">执行结果:</div>
          <div className="text-xs text-gray-300 max-h-20 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 微博登录执行器组件
 * 专门处理微博登录的交互界面
 */
export const WeiboLoginExecutor: React.FC<{
  onLoginSuccess: (data: any) => void
  onLoginCancel: () => void
  className?: string
}> = ({ onLoginSuccess, onLoginCancel, className }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 监听二维码事件
    const handleQRCode = (event: CustomEvent) => {
      setQrCodeUrl(event.detail.qrUrl)
      setIsLoading(false)
    }

    // 监听登录成功事件
    const handleLoginSuccess = (event: CustomEvent) => {
      onLoginSuccess(event.detail)
    }

    window.addEventListener('weibo-login-qr-code', handleQRCode as EventListener)
    window.addEventListener('weibo-login-success', handleLoginSuccess as EventListener)

    return () => {
      window.removeEventListener('weibo-login-qr-code', handleQRCode as EventListener)
      window.removeEventListener('weibo-login-success', handleLoginSuccess as EventListener)
    }
  }, [onLoginSuccess])

  const handleCancel = () => {
    onLoginCancel()
  }

  return (
    <div className={cn(
      'p-4 bg-slate-800 border border-slate-600 rounded-lg text-center',
      className
    )}>
      <h4 className="text-sm font-medium text-white mb-3">
        微博登录
      </h4>

      {isLoading && (
        <div className="text-blue-400 text-sm">
          正在获取二维码...
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm mb-3">
          {error}
        </div>
      )}

      {qrCodeUrl && (
        <>
          <div className="mb-3">
            <img
              src={qrCodeUrl}
              alt="微博登录二维码"
              className="mx-auto border-2 border-white rounded"
              style={{ width: '200px', height: '200px' }}
            />
          </div>
          <div className="text-gray-300 text-sm mb-4">
            请使用微博App扫描二维码登录
          </div>
        </>
      )}

      <button
        onClick={handleCancel}
        className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
      >
        取消登录
      </button>
    </div>
  )
}