import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboLoginAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { generateId } from '@sker/workflow';

/**
 * 微博登录事件类型 (浏览器端定义)
 */
export type WeiboLoginEventType = 'qrcode' | 'status' | 'scanned' | 'success' | 'expired' | 'error';

/**
 * 微博登录事件 (从 SSE 接收)
 */
export interface WeiboLoginEvent {
  type: WeiboLoginEventType;
  data: any;
  sessionId?: string;
  timestamp?: Date;
}

/**
 * 微博登录浏览器端执行器
 *
 * 存在即合理：
 * - 浏览器端无法运行 Playwright，必须通过 SSE 连接后端服务
 * - 负责建立 SSE 长连接，接收实时登录状态
 * - 触发 UI 事件，显示二维码对话框
 * - 更新 AST 节点状态和输出数据
 *
 * 优雅设计：
 * - 与后端 WeiboLoginAstVisitor 职责互补
 * - 通过 EventSource 建立单向推送通道
 * - 使用 RxJS Observable 统一事件流接口
 * - 自动清理连接，防止资源泄漏
 */
@Injectable()
export class WeiboLoginBrowserVisitor {
  @Handler(WeiboLoginAst)
  handler(ast: WeiboLoginAst, ctx: any): Observable<WeiboLoginAst> {
    // 创建共享的 Observable 事件流
    // shareReplay(1) 确保：
    // 1. 多个订阅者共享同一个 SSE 连接
    // 2. 新订阅者可以获取最后一个事件
    // 3. 即使第一个订阅者取消订阅，连接仍然保持
    const events$ = new Observable<WeiboLoginAst>(subscriber => {
      // 建立 SSE 连接
      const eventSource = new EventSource(
        `/api/sse/weibo-login?userId=${ast.id}`,
        { withCredentials: true }
      );

      // 处理 SSE 消息
      eventSource.onmessage = (event) => {
        try {
          const eventData: WeiboLoginEvent = JSON.parse(event.data);

          // 根据事件类型更新 AST 状态
          switch (eventData.type) {
            case 'qrcode':
              // 触发显示二维码的自定义事件
              ast.state = 'running'
              ast.qrcode = eventData.data.image
              subscriber.next(ast)
              break;

            case 'scanned':
              // 用户已扫码，等待确认
              ast.state = 'running'
              subscriber.next(ast)
              break;

            case 'success':
              // 登录成功
              ast.account = eventData.data;
              ast.state = 'success';
              subscriber.next(ast)
              eventSource.close();
              subscriber.complete();
              break;

            case 'expired':
              // 二维码过期
              ast.state = 'fail';
              subscriber.next(ast)
              ast.setError(new Error('二维码已过期'), true);
              eventSource.close();
              break;

            case 'error':
              // 登录失败
              const errorMsg = eventData.data?.message || '登录失败';
              ast.state = 'fail';
              subscriber.next(ast)
              ast.setError(new Error(errorMsg), true);
              eventSource.close();
              break;
          }
        } catch (error) {
          console.error('处理 SSE 事件失败:', error);
        }
      };

      // 处理 SSE 错误
      eventSource.onerror = (error) => {
        console.error('SSE 连接错误:', error);

        // 检查连接状态
        if (eventSource.readyState === EventSource.CLOSED) {
          ast.state = 'fail';
          subscriber.next(ast)
          ast.setError(new Error('SSE 连接已关闭'), true);
        }

        eventSource.close();
      };

      // 返回清理函数
      return () => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
        }
      };
    }).pipe(
      shareReplay(1) // 共享订阅，允许多个订阅者
    );
    return events$
  }

}
