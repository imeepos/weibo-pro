import { root } from '@sker/core'
import { Ast } from '@sker/workflow'
import { FrontendExecutor, FrontendExecutorContext } from './frontend-executor'

/**
 * SSE事件类型
 */
export interface SSEEvent {
  type: 'progress' | 'qr_code' | 'login_success' | 'login_failed' | 'error'
  data?: any
  message?: string
}

/**
 * 微博登录执行器 - 支持SSE长连接和二维码交互
 */
export class WeiboLoginExecutor implements FrontendExecutor {
  private eventSource: EventSource | null = null
  private isConnecting = false

  async execute(ast: Ast, context: FrontendExecutorContext): Promise<Ast> {
    const { onStateChange, onProgress, onResult } = context

    try {
      onStateChange?.('running')
      onProgress?.(0, '开始微博登录')

      // 启动SSE连接
      await this.startSSEConnection(ast, context)

      // 等待登录完成
      const result = await this.waitForLoginCompletion()

      onProgress?.(100, '登录完成')
      onStateChange?.('success')
      onResult?.(result)

      return { ...ast, state: 'success' } as Ast
    } catch (error) {
      onStateChange?.('fail', error instanceof Error ? error : new Error(String(error)))
      this.closeSSEConnection()
      throw error
    }
  }

  canExecute(ast: Ast): boolean {
    // 检查是否是微博登录相关的AST节点
    return ast.constructor.name.includes('Weibo') &&
           (ast as any).action === 'login' ||
           (ast as any).type === 'authentication'
  }

  getName(): string {
    return '微博登录执行器'
  }

  /**
   * 启动SSE连接
   */
  private async startSSEConnection(ast: Ast, context: FrontendExecutorContext): Promise<void> {
    const { onProgress } = context

    if (this.isConnecting) {
      throw new Error('SSE连接已在进行中')
    }

    this.isConnecting = true

    try {
      onProgress?.(10, '建立SSE连接')

      // 构建SSE URL
      const sseUrl = this.buildSSEUrl(ast)

      this.eventSource = new EventSource(sseUrl)

      // 监听SSE事件
      this.eventSource.onmessage = (event) => {
        this.handleSSEEvent(event, context)
      }

      this.eventSource.onerror = (error) => {
        this.handleSSEError(error, context)
      }

      onProgress?.(20, 'SSE连接已建立')

    } catch (error) {
      this.isConnecting = false
      throw error
    }
  }

  /**
   * 构建SSE URL
   */
  private buildSSEUrl(ast: Ast): string {
    const baseUrl = this.getApiBaseUrl()
    const params = new URLSearchParams()

    // 添加AST相关信息
    if (ast.id) {
      params.append('nodeId', ast.id)
    }
    params.append('type', 'weibo_login')

    return `${baseUrl}/api/weibo/login/sse?${params.toString()}`
  }

  /**
   * 获取API基础URL
   */
  private getApiBaseUrl(): string {
    // 从环境变量或配置中获取
    const controller = root.get<any>('WorkflowController')
    if (controller && controller.baseUrl) {
      return controller.baseUrl
    }

    // 默认使用当前域名
    return window.location.origin
  }

  /**
   * 处理SSE事件
   */
  private handleSSEEvent(event: MessageEvent, context: FrontendExecutorContext): void {
    const { onProgress, onResult } = context

    try {
      const sseEvent: SSEEvent = JSON.parse(event.data)

      switch (sseEvent.type) {
        case 'progress':
          onProgress?.(sseEvent.data?.progress || 0, sseEvent.message)
          break

        case 'qr_code':
          // 显示二维码
          this.showQRCode(sseEvent.data?.qrUrl, context)
          onProgress?.(30, '请扫描二维码登录')
          break

        case 'login_success':
          onProgress?.(100, '登录成功')
          onResult?.(sseEvent.data)
          this.closeSSEConnection()
          break

        case 'login_failed':
          throw new Error(sseEvent.message || '登录失败')

        case 'error':
          throw new Error(sseEvent.message || 'SSE连接错误')

        default:
          console.warn('未知的SSE事件类型:', sseEvent.type)
      }
    } catch (error) {
      console.error('处理SSE事件失败:', error)
    }
  }

  /**
   * 处理SSE错误
   */
  private handleSSEError(error: Event, context: FrontendExecutorContext): void {
    const { onStateChange } = context

    console.error('SSE连接错误:', error)

    if (this.eventSource?.readyState === EventSource.CLOSED) {
      onStateChange?.('fail', new Error('SSE连接已关闭'))
      this.closeSSEConnection()
    }
  }

  /**
   * 显示二维码
   */
  private showQRCode(qrUrl: string, context: FrontendExecutorContext): void {
    // 触发自定义事件，让UI组件显示二维码
    const qrEvent = new CustomEvent('weibo-login-qr-code', {
      detail: {
        qrUrl,
        onCancel: () => {
          this.closeSSEConnection()
          context.onStateChange?.('fail', new Error('用户取消登录'))
        }
      }
    })

    window.dispatchEvent(qrEvent)
  }

  /**
   * 等待登录完成
   */
  private waitForLoginCompletion(): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('登录超时'))
      }, 300000) // 5分钟超时

      // 监听登录成功事件
      const successHandler = (event: CustomEvent) => {
        clearTimeout(timeout)
        window.removeEventListener('weibo-login-success', successHandler as EventListener)
        resolve(event.detail)
      }

      window.addEventListener('weibo-login-success', successHandler as EventListener)
    })
  }

  /**
   * 关闭SSE连接
   */
  private closeSSEConnection(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.isConnecting = false
  }
}

/**
 * 实时状态执行器 - 支持SSE推送执行进度
 */
export class RealtimeStatusExecutor implements FrontendExecutor {
  private eventSource: EventSource | null = null

  async execute(ast: Ast, context: FrontendExecutorContext): Promise<Ast> {
    const { onStateChange, onProgress } = context

    try {
      onStateChange?.('running')
      onProgress?.(0, '开始执行')

      // 启动实时状态监听
      await this.startRealtimeStatus(ast, context)

      // 同时调用后端执行
      const controller = root.get<any>('WorkflowController')
      if (controller && typeof controller.executeNode === 'function') {
        const result = await controller.executeNode(ast)

        onProgress?.(100, '执行完成')
        onStateChange?.('success')

        this.closeRealtimeStatus()
        return result
      } else {
        throw new Error('WorkflowController 未找到')
      }

    } catch (error) {
      onStateChange?.('fail', error instanceof Error ? error : new Error(String(error)))
      this.closeRealtimeStatus()
      throw error
    }
  }

  canExecute(ast: Ast): boolean {
    // 支持所有需要实时状态更新的节点
    return true
  }

  getName(): string {
    return '实时状态执行器'
  }

  /**
   * 启动实时状态监听
   */
  private async startRealtimeStatus(ast: Ast, context: FrontendExecutorContext): Promise<void> {
    const { onProgress } = context

    const statusUrl = this.buildStatusUrl(ast)

    this.eventSource = new EventSource(statusUrl)

    this.eventSource.onmessage = (event) => {
      try {
        const statusData = JSON.parse(event.data)

        if (statusData.progress !== undefined) {
          onProgress?.(statusData.progress, statusData.message)
        }

        if (statusData.state) {
          // 状态更新通过其他机制处理
        }

      } catch (error) {
        console.error('处理实时状态数据失败:', error)
      }
    }

    this.eventSource.onerror = (error) => {
      console.warn('实时状态连接错误:', error)
    }

    onProgress?.(10, '实时状态监听已启动')
  }

  /**
   * 构建状态URL
   */
  private buildStatusUrl(ast: Ast): string {
    const baseUrl = this.getApiBaseUrl()
    const params = new URLSearchParams()

    if (ast.id) {
      params.append('nodeId', ast.id)
    }
    params.append('type', 'realtime_status')

    return `${baseUrl}/api/workflow/status/sse?${params.toString()}`
  }

  /**
   * 获取API基础URL
   */
  private getApiBaseUrl(): string {
    const controller = root.get<any>('WorkflowController')
    if (controller && controller.baseUrl) {
      return controller.baseUrl
    }
    return window.location.origin
  }

  /**
   * 关闭实时状态监听
   */
  private closeRealtimeStatus(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }
}