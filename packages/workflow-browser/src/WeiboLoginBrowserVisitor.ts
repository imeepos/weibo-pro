import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboLoginAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

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
  handler(ast: WeiboLoginAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
