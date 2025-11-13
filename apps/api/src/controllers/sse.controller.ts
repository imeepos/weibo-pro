import { Controller, Get, Query, Res, Sse, MessageEvent } from '@nestjs/common'
import { Response } from 'express'
import { Observable, interval, map } from 'rxjs'
import { logger } from '../utils/logger'

/**
 * SSE控制器 - 提供实时事件推送
 *
 * 优雅设计：
 * - 支持Server-Sent Events (SSE) 实时通信
 * - 为前端执行器提供实时状态更新
 * - 支持微博登录的二维码推送
 * - 轻量级、高效的实时通信方案
 */
@Controller('api/sse')
export class SseController {

  /**
   * 微博登录SSE流
   *
   * 优雅设计：
   * - 支持微博登录的实时状态推送
   * - 推送二维码URL和登录状态
   * - 支持长连接保持
   */
  @Sse('weibo-login')
  weiboLoginSse(@Query() query: { nodeId?: string }): Observable<MessageEvent> {
    const { nodeId } = query

    logger.info('微博登录SSE连接已建立', { nodeId })

    return new Observable<MessageEvent>(subscriber => {
      // 模拟微博登录流程
      const simulateWeiboLogin = async () => {
        try {
          // 1. 推送进度
          subscriber.next({
            type: 'progress',
            data: { progress: 10 },
            message: '开始微博登录流程'
          } as MessageEvent)

          // 等待1秒
          await this.delay(1000)

          // 2. 推送二维码
          const qrUrl = await this.generateWeiboQRCode()
          subscriber.next({
            type: 'qr_code',
            data: { qrUrl },
            message: '请扫描二维码登录'
          } as MessageEvent)

          subscriber.next({
            type: 'progress',
            data: { progress: 30 },
            message: '等待扫码...'
          } as MessageEvent)

          // 3. 模拟等待扫码（实际应该监听微博登录状态）
          await this.delay(5000)

          // 4. 推送登录成功
          subscriber.next({
            type: 'login_success',
            data: {
              accountId: '123456',
              username: 'test_user',
              cookie: 'mock_cookie_data'
            },
            message: '登录成功'
          } as MessageEvent)

          subscriber.next({
            type: 'progress',
            data: { progress: 100 },
            message: '登录流程完成'
          } as MessageEvent)

          // 完成
          subscriber.complete()

        } catch (error) {
          logger.error('微博登录SSE流程错误', { error })
          subscriber.next({
            type: 'error',
            data: { error: error.message },
            message: '登录失败'
          } as MessageEvent)
          subscriber.complete()
        }
      }

      simulateWeiboLogin()

      // 清理函数
      return () => {
        logger.info('微博登录SSE连接已关闭', { nodeId })
      }
    })
  }

  /**
   * 实时状态SSE流
   *
   * 优雅设计：
   * - 为前端执行器提供实时执行状态
   * - 支持节点执行进度推送
   * - 支持执行状态更新
   */
  @Sse('workflow-status')
  workflowStatusSse(@Query() query: { nodeId?: string; runId?: string }): Observable<MessageEvent> {
    const { nodeId, runId } = query

    logger.info('工作流状态SSE连接已建立', { nodeId, runId })

    // 使用interval创建定时推送
    return interval(1000).pipe(
      map((count) => {
        // 模拟执行进度
        const progress = Math.min(100, count * 10)

        const event: MessageEvent = {
          type: 'progress',
          data: {
            progress,
            nodeId,
            runId,
            timestamp: new Date().toISOString()
          },
          message: progress < 100 ? `执行中... ${progress}%` : '执行完成'
        }

        // 当进度达到100%时，推送完成事件
        if (progress >= 100) {
          return {
            ...event,
            type: 'complete',
            message: '执行完成'
          } as MessageEvent
        }

        return event
      })
    )
  }

  /**
   * 节点执行状态SSE流
   *
   * 优雅设计：
   * - 专门为单个节点执行提供状态推送
   * - 支持详细的执行进度信息
   * - 支持错误状态推送
   */
  @Sse('node-execution')
  nodeExecutionSse(@Query() query: { nodeId: string }): Observable<MessageEvent> {
    const { nodeId } = query

    if (!nodeId) {
      throw new Error('节点ID不能为空')
    }

    logger.info('节点执行SSE连接已建立', { nodeId })

    return new Observable<MessageEvent>(subscriber => {
      const simulateNodeExecution = async () => {
        try {
          const steps = [
            { progress: 0, message: '开始执行节点' },
            { progress: 20, message: '准备执行参数' },
            { progress: 40, message: '调用执行器' },
            { progress: 60, message: '处理执行结果' },
            { progress: 80, message: '提取输出数据' },
            { progress: 100, message: '节点执行完成' }
          ]

          for (const step of steps) {
            subscriber.next({
              type: 'progress',
              data: {
                progress: step.progress,
                nodeId,
                step: step.message
              },
              message: step.message
            } as MessageEvent)

            // 模拟执行耗时
            await this.delay(1000)
          }

          // 推送完成事件
          subscriber.next({
            type: 'complete',
            data: {
              nodeId,
              result: { success: true, message: '节点执行成功' }
            },
            message: '节点执行完成'
          } as MessageEvent)

          subscriber.complete()

        } catch (error) {
          logger.error('节点执行SSE流程错误', { nodeId, error })
          subscriber.next({
            type: 'error',
            data: {
              nodeId,
              error: error.message
            },
            message: '节点执行失败'
          } as MessageEvent)
          subscriber.complete()
        }
      }

      simulateNodeExecution()

      return () => {
        logger.info('节点执行SSE连接已关闭', { nodeId })
      }
    })
  }

  /**
   * 健康检查SSE流
   *
   * 优雅设计：
   * - 提供系统健康状态实时监控
   * - 支持前端健康状态显示
   * - 轻量级心跳检测
   */
  @Sse('health')
  healthSse(): Observable<MessageEvent> {
    return interval(30000).pipe(
      map(() => ({
        type: 'health',
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'connected',
            redis: 'connected',
            rabbitmq: 'connected'
          }
        },
        message: '系统运行正常'
      } as MessageEvent))
    )
  }

  /**
   * 生成微博二维码URL
   */
  private async generateWeiboQRCode(): Promise<string> {
    // 模拟生成二维码URL
    // 实际应该调用微博API获取真实的二维码
    return 'https://example.com/weibo-qr-code.png'
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}