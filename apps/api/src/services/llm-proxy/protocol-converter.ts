import { logger } from '@sker/core';
import {
  ToCodexVisitor,
  ToOpenAiVisitor,
  ToAnthropicVisitor,
  OpenAiRequestAst,
  ClaudeRequestAst,
  CodexRequestAst,
  CodexResponseAst,
  OpenAIResponseAst,
  ClaudeResponseAst,
  OpenAIStreamResponseAst,
  ClaudeStreamEventAst,
  CodexStreamEventAst,
  type CodexRequest,
  type CodexResponse,
  type CodexResponseEvent,
  type ClaudeRequest,
  type ClaudeResponse,
  type ClaudeStreamEvent,
  type OpenAIRequest,
  type OpenAIResponse,
  type OpenAIStreamResponse,
  Ast
} from '@sker/llm-protocol';

/**
 * 协议转换器：使用 Visitor 模式在 openai / anthropic / codex 协议间转换
 * 请求、响应、流式事件三者均支持
 */
export class ProtocolConverter {
  private toCodexVisitor = new ToCodexVisitor();
  private toOpenAiVisitor = new ToOpenAiVisitor();
  private toAnthropicVisitor = new ToAnthropicVisitor();

  /**
   * 使用 Visitor 转换流式事件
   * @param needsConversion 是否需要转换
   * @param fromProtocol 源协议（Provider 的协议）
   * @param toProtocol 目标协议（客户端期望的协议）
   * @param data 流式事件数据
   * @param ctx 上下文对象（用于维护流式状态）
   * @returns 转换后的事件（可能是单个事件或事件数组）
   */
  convertStreamEvent(
    needsConversion: boolean,
    fromProtocol: string,
    toProtocol: string,
    data: unknown,
    ctx: Record<string, unknown>
  ): unknown {
    if (!needsConversion) {
      return data
    }

    // 创建源协议的流式 AST
    let ast: Ast
    if (fromProtocol === 'openai') {
      const openaiAst = new OpenAIStreamResponseAst()
      openaiAst.streamEvent = data as OpenAIStreamResponse
      ast = openaiAst
    } else if (fromProtocol === 'anthropic') {
      const claudeAst = new ClaudeStreamEventAst()
      claudeAst.streamEvent = data as ClaudeStreamEvent
      ast = claudeAst
    } else if (fromProtocol === 'codex') {
      const codexAst = new CodexStreamEventAst()
      codexAst.streamEvent = data as CodexResponseEvent
      ast = codexAst
    } else {
      logger.warn(`不支持的源协议`, { protocol: fromProtocol })
      return data
    }

    // 使用目标协议的 Visitor 转换
    try {
      if (toProtocol === 'openai') {
        return this.toOpenAiVisitor.visit(ast, ctx)
      } else if (toProtocol === 'anthropic') {
        return this.toAnthropicVisitor.visit(ast, ctx)
      } else if (toProtocol === 'codex') {
        return this.toCodexVisitor.visit(ast, ctx)
      } else {
        logger.warn(`不支持的目标协议`, { protocol: toProtocol })
        return data
      }
    } catch (error) {
      logger.error(`流式转换失败`, { from: fromProtocol, to: toProtocol, error })
      return data
    }
  }

  /**
   * 请求协议转换（使用 Visitor 模式一步完成）
   * @param fromProtocol 源协议
   * @param toProtocol 目标协议
   * @param request 请求体
   * @returns 转换后的请求体
   */
  convertRequest(fromProtocol: string, toProtocol: string, request: Record<string, unknown>): Record<string, unknown> | null {
    // 协议相同，无需转换
    if (fromProtocol === toProtocol) {
      return request
    }

    // 创建源协议的 AST
    let ast: Ast
    if (fromProtocol === 'openai') {
      const openaiAst = new OpenAiRequestAst()
      openaiAst.request = request as unknown as OpenAIRequest
      ast = openaiAst
    } else if (fromProtocol === 'anthropic') {
      const claudeAst = new ClaudeRequestAst()
      claudeAst.request = request as unknown as ClaudeRequest
      ast = claudeAst
    } else if (fromProtocol === 'codex') {
      const codexAst = new CodexRequestAst()
      codexAst.request = request as unknown as CodexRequest
      ast = codexAst
    } else {
      logger.error(`不支持的源协议`, { protocol: fromProtocol })
      return null
    }

    // 使用目标协议的 Visitor 一步完成转换
    try {
      if (toProtocol === 'openai') {
        return this.toOpenAiVisitor.visit(ast, {})
      } else if (toProtocol === 'anthropic') {
        return this.toAnthropicVisitor.visit(ast, {})
      } else if (toProtocol === 'codex') {
        return this.toCodexVisitor.visit(ast, {})
      } else {
        logger.error(`不支持的目标协议`, { protocol: toProtocol })
        return null
      }
    } catch (error) {
      logger.error(`转换失败`, { from: fromProtocol, to: toProtocol, error })
      return null
    }
  }

  /**
   * 响应协议转换（使用 Visitor 模式一步完成）
   * @param fromProtocol 源协议（Provider 的协议）
   * @param toProtocol 目标协议（客户端期望的协议）
   * @param response 响应体
   * @returns 转换后的响应体
   */
  convertResponse(fromProtocol: string, toProtocol: string, response: Record<string, unknown>): Record<string, unknown> | null {
    // 协议相同，无需转换
    if (fromProtocol === toProtocol) {
      return response
    }

    // 创建源协议的 AST
    let ast: Ast
    if (fromProtocol === 'openai') {
      const openaiAst = new OpenAIResponseAst()
      openaiAst.response = response as unknown as OpenAIResponse
      ast = openaiAst
    } else if (fromProtocol === 'anthropic') {
      const claudeAst = new ClaudeResponseAst()
      claudeAst.response = response as unknown as ClaudeResponse
      ast = claudeAst
    } else if (fromProtocol === 'codex') {
      const codexAst = new CodexResponseAst()
      codexAst.response = response as unknown as CodexResponse
      ast = codexAst
    } else {
      logger.error(`不支持的源协议`, { protocol: fromProtocol })
      return null
    }

    // 使用目标协议的 Visitor 一步完成转换
    try {
      if (toProtocol === 'openai') {
        return this.toOpenAiVisitor.visit(ast, {})
      } else if (toProtocol === 'anthropic') {
        return this.toAnthropicVisitor.visit(ast, {})
      } else if (toProtocol === 'codex') {
        return this.toCodexVisitor.visit(ast, {})
      } else {
        logger.error(`不支持的目标协议`, { protocol: toProtocol })
        return null
      }
    } catch (error) {
      logger.error(`转换失败`, { from: fromProtocol, to: toProtocol, error, response: JSON.stringify(response).slice(0, 1000) })
      // 重新抛出异常，让调用方知道转换失败
      throw error
    }
  }
}
