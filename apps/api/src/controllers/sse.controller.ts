import { Controller, Get, Query, Res, Sse, MessageEvent } from '@nestjs/common'
import { Observable, interval, map } from 'rxjs'
import { logger } from '@sker/core'
import { root } from '@sker/core'
import { WeiboAuthService, WeiboLoginAstVisitor, WeiboLoginEvent as WeiboLoginEventType } from '@sker/workflow-run'

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
      let subscription: any;

      // 启动微博登录流程
      this.weiboAuthService.startLogin(userId).then(events$ => {
        // 订阅登录事件流
        subscription = events$.subscribe({
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
      }).catch(err => {
        logger.error('启动微博登录失败', { userId, error: err.message });
        subscriber.next({
          type: 'error',
          data: { message: err.message || '启动登录失败' },
        } as MessageEvent);
        subscriber.complete();
      });

      // 返回清理函数（必须同步返回）
      return () => {
        logger.info('微博登录SSE连接已关闭', { userId });
        subscription?.unsubscribe();
      };
    });
  }
}