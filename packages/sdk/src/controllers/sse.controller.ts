import { Controller, Sse, Query } from '@sker/core'
import { Observable } from 'rxjs'
import type {
  SSEEvent,
  WeiboLoginSSEQuery,
  WorkflowStatusSSEQuery,
  NodeExecutionSSEQuery
} from '../types'

/**
 * SSE控制器 - 提供实时事件推送接口
 *
 * 优雅设计：
 * - 为前端执行器提供SSE实时通信能力
 * - 支持微博登录、工作流状态、节点执行等实时事件
 * - 统一的SSE事件格式和错误处理
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
  weiboLoginSse(@Query() query: WeiboLoginSSEQuery): Observable<SSEEvent> {
    throw new Error('method weiboLoginSse not implements')
  }

  /**
   * 工作流状态SSE流
   *
   * 优雅设计：
   * - 为前端执行器提供实时执行状态
   * - 支持节点执行进度推送
   * - 支持执行状态更新
   */
  @Sse('workflow-status')
  workflowStatusSse(@Query() query: WorkflowStatusSSEQuery): Observable<SSEEvent> {
    throw new Error('method workflowStatusSse not implements')
  }

  /**
   * 节点执行SSE流
   *
   * 优雅设计：
   * - 专门为单个节点执行提供状态推送
   * - 支持详细的执行进度信息
   * - 支持错误状态推送
   */
  @Sse('node-execution')
  nodeExecutionSse(@Query() query: NodeExecutionSSEQuery): Observable<SSEEvent> {
    throw new Error('method nodeExecutionSse not implements')
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
  healthSse(): Observable<SSEEvent> {
    throw new Error('method healthSse not implements')
  }
}