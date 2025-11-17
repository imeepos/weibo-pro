import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboLoginAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
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
  async handler(ast: WeiboLoginAst, ctx: any): Promise<WeiboLoginAst> {
    return new Promise((resolve, reject) => {
      const userId = generateId();

      // 创建 Observable 事件流
      ast.events$ = new Observable(subscriber => {
        // 建立 SSE 连接
        const eventSource = new EventSource(
          `/api/sse/weibo-login?userId=${userId}`,
          { withCredentials: true }
        );

        // 处理 SSE 消息
        eventSource.onmessage = (event) => {
          try {
            const eventData: WeiboLoginEvent = JSON.parse(event.data);

            // 推送到事件流
            subscriber.next(eventData);

            // 根据事件类型更新 AST 状态
            switch (eventData.type) {
              case 'qrcode':
                // 触发显示二维码的自定义事件
                this.dispatchQRCodeEvent(eventData.data.image, userId);
                break;

              case 'scanned':
                // 用户已扫码，等待确认
                this.dispatchStatusEvent('已扫码，请在手机上确认');
                break;

              case 'success':
                // 登录成功
                ast.account = eventData.data;
                ast.state = 'success';
                this.dispatchStatusEvent('登录成功');
                eventSource.close();
                subscriber.complete();
                break;

              case 'expired':
                // 二维码过期
                ast.state = 'fail';
                ast.setError(new Error('二维码已过期'), true);
                this.dispatchStatusEvent('二维码已过期');
                eventSource.close();
                subscriber.error(new Error('二维码已过期'));
                break;

              case 'error':
                // 登录失败
                const errorMsg = eventData.data?.message || '登录失败';
                ast.state = 'fail';
                ast.setError(new Error(errorMsg), true);
                this.dispatchStatusEvent(errorMsg);
                eventSource.close();
                subscriber.error(new Error(errorMsg));
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
            ast.setError(new Error('SSE 连接已关闭'), true);
            this.dispatchStatusEvent('连接已断开');
            subscriber.error(new Error('SSE 连接已关闭'));
          }

          eventSource.close();
        };

        // 返回清理函数
        return () => {
          if (eventSource.readyState !== EventSource.CLOSED) {
            eventSource.close();
          }
        };
      });

      // 设置节点为 pending 状态，等待 SSE 事件更新
      ast.state = 'pending';
      return ast;
    })
  }

  /**
   * 触发二维码显示事件
   * UI 组件监听此事件以显示二维码对话框
   */
  private dispatchQRCodeEvent(imageBase64: string, sessionId: string): void {
    window.dispatchEvent(new CustomEvent('weibo-qrcode-show', {
      detail: {
        image: imageBase64,
        sessionId,
        timestamp: new Date()
      }
    }));
  }

  /**
   * 触发状态更新事件
   * 用于更新 UI 显示的登录状态信息
   */
  private dispatchStatusEvent(message: string): void {
    window.dispatchEvent(new CustomEvent('weibo-login-status', {
      detail: {
        message,
        timestamp: new Date()
      }
    }));
  }
}
