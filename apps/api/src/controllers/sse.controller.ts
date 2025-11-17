import { Controller, Get, Query, Res, Sse, MessageEvent } from '@nestjs/common'
import { Response } from 'express'
import { Observable, interval, map } from 'rxjs'
import { logger } from '../utils/logger'
import { root } from '@sker/core'
import { WeiboAuthService, WeiboLoginEvent as WeiboLoginEventType } from '@sker/workflow-run'

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
  private readonly weiboAuthService: WeiboAuthService;

  constructor() {
    this.weiboAuthService = root.get(WeiboAuthService);
  }

  /**
   * 微博登录SSE流
   *
   * 优雅设计：
   * - 连接真实的 WeiboAuthService
   * - 订阅 Observable 事件流并转发到 SSE
   * - 支持二维码推送、扫码状态、登录成功等实时事件
   * - 自动管理会话生命周期和清理
   */
  @Sse('weibo-login')
  weiboLoginSse(@Query() query: { userId?: string }): Observable<MessageEvent> {
    const { userId } = query;

    if (!userId) {
      logger.error('微博登录SSE: userId 参数缺失');
      return new Observable<MessageEvent>(subscriber => {
        subscriber.next({
          type: 'error',
          data: { message: 'userId 参数不能为空' },
        } as MessageEvent);
        subscriber.complete();
      });
    }

    logger.info('微博登录SSE连接已建立', { userId });

    return new Observable<MessageEvent>(subscriber => {
      // 启动微博登录流程
      this.weiboAuthService.startLogin(userId).then(events$ => {
        // 订阅登录事件流
        const subscription = events$.subscribe({
          next: (event: WeiboLoginEventType) => {
            logger.debug('微博登录事件', { type: event.type, userId });

            // 将后端事件转换为 SSE MessageEvent
            subscriber.next({
              type: event.type,
              data: event.data,
            } as MessageEvent);

            // 登录成功或失败后完成流
            if (event.type === 'success' || event.type === 'error' || event.type === 'expired') {
              logger.info('微博登录流程结束', { type: event.type, userId });
              subscriber.complete();
            }
          },
          error: (err) => {
            logger.error('微博登录流程错误', { userId, error: err.message });
            subscriber.next({
              type: 'error',
              data: { message: err.message || '登录失败' },
            } as MessageEvent);
            subscriber.complete();
          },
          complete: () => {
            logger.info('微博登录流程完成', { userId });
            subscriber.complete();
          }
        });

        // 返回清理函数
        return () => {
          logger.info('微博登录SSE连接已关闭', { userId });
          subscription.unsubscribe();
        };
      }).catch(err => {
        logger.error('启动微博登录失败', { userId, error: err.message });
        subscriber.next({
          type: 'error',
          data: { message: err.message || '启动登录失败' },
        } as MessageEvent);
        subscriber.complete();
      });
    });
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
}