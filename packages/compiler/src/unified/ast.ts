/**
 * @fileoverview 统一抽象层 AST 节点定义
 * @description 定义 UnifiedRequestAst、UnifiedResponseAst 和 UnifiedStreamEventAst
 * @version 2.0
 */

import { Ast, Visitor } from '../ast';
import {
  UnifiedProvider,
  UnifiedMessage,
  UnifiedTool,
  UnifiedContent,
  UnifiedStopReason,
  UnifiedUsage
} from './types';

// ==================== 统一请求 ====================

/**
 * 统一请求 AST 节点
 * 抽象了不同厂商（Anthropic、OpenAI、Google）的请求格式
 */
export class UnifiedRequestAst extends Ast {
  /** 模型名称 */
  model!: string;

  /** 消息列表 */
  messages!: UnifiedMessage[];

  /** 系统提示（各厂商处理方式不同） */
  system?: string;

  /** 工具定义列表 */
  tools?: UnifiedTool[];

  /** 最大生成 token 数 */
  maxTokens?: number;

  /** 温度参数（控制随机性） */
  temperature?: number;

  /** 核采样概率 */
  topP?: number;

  /** Top-K 采样（Google 特有） */
  topK?: number;

  /** 是否使用流式响应 */
  stream?: boolean;

  /** 停止序列 */
  stopSequences?: string[];

  /** 原始信息保留（用于无损反向转换） */
  _provider?: UnifiedProvider;
  _original?: any;

  /**
   * 接受访问者
   * @param visitor 访问者对象
   * @param ctx 上下文对象
   * @returns 访问结果
   */
  visit(visitor: Visitor, ctx: any): any {
    return visitor.visitUnifiedRequestAst?.(this, ctx);
  }
}

// ==================== 统一响应 ====================

/**
 * 统一响应 AST 节点
 * 抽象了不同厂商的响应格式
 */
export class UnifiedResponseAst extends Ast {
  /** 响应 ID */
  id?: string;

  /** 模型名称 */
  model?: string;

  /** 消息角色（固定为 assistant） */
  role!: 'assistant';

  /** 响应内容块列表 */
  content!: UnifiedContent[];

  /** 停止原因 */
  stopReason?: UnifiedStopReason;

  /** 使用量统计 */
  usage?: UnifiedUsage;

  /** 原始信息保留 */
  _provider?: UnifiedProvider;
  _original?: any;

  /** Anthropic 特有字段（可选） */
  _anthropic?: {
    stop_sequence?: string | null;
    type?: string;
  };

  /** OpenAI 特有字段（可选） */
  _openai?: {
    object?: string;
    created?: number;
    system_fingerprint?: string;
  };

  /** Google 特有字段（可选） */
  _google?: {
    modelVersion?: string;
    finishReason?: string;
  };

  /**
   * 接受访问者
   * @param visitor 访问者对象
   * @param ctx 上下文对象
   * @returns 访问结果
   */
  visit(visitor: Visitor, ctx: any): any {
    return visitor.visitUnifiedResponseAst?.(this, ctx);
  }
}

// ==================== 统一流式事件 ====================

/**
 * 流式事件类型
 */
export type UnifiedStreamEventType =
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop';

/**
 * 统一流式事件 AST 节点
 * 用于处理流式响应中的各种事件
 */
export class UnifiedStreamEventAst extends Ast {
  /** 事件类型 */
  eventType!: UnifiedStreamEventType;

  /** 部分消息对象（message_start/message_delta 事件） */
  message?: Partial<UnifiedResponseAst>;

  /** 内容块信息（content_block_* 事件） */
  contentBlock?: {
    /** 块索引 */
    index: number;

    /** 块类型 */
    type: string;

    /** 增量内容 */
    delta?: Partial<UnifiedContent>;
  };

  /** 原始信息保留 */
  _provider?: UnifiedProvider;
  _original?: any;

  /**
   * 接受访问者
   * @param visitor 访问者对象
   * @param ctx 上下文对象
   * @returns 访问结果
   */
  visit(visitor: Visitor, ctx: any): any {
    return visitor.visitUnifiedStreamEventAst?.(this, ctx);
  }
}
