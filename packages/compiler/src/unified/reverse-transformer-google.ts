/**
 * @fileoverview 统一抽象层 - 反向转换 Google
 * @description 将 UnifiedResponseAst 转换回 Google 原始格式
 * @version 2.0
 */

import { UnifiedResponseAst, UnifiedContent, UnifiedStopReason, UnifiedUsage } from '../ast';
import {
  GoogleResponseAst,
  GoogleUsageMetadata,
  GoogleTextPart,
  GoogleFunctionCallPart,
  GoogleFunctionResponsePart,
  GoogleContentPart
} from '../ast';

/**
 * 将 Unified 响应转换为 Google 响应格式
 * @param unified 统一响应 AST
 * @returns Google 响应 AST
 */
export function toGoogleResponse(unified: UnifiedResponseAst): GoogleResponseAst {
  const ast = new GoogleResponseAst();

  // 内容转换
  ast.candidates = [{
    content: {
      role: 'model',
      parts: transformContentToGoogleParts(unified.content)
    },
    finishReason: mapStopReasonToGoogle(unified.stopReason)
  }];

  // Usage 转换
  if (unified.usage) {
    ast.usageMetadata = transformUsageToGoogle(unified.usage);
  }

  // Google 特有字段
  ast.modelVersion = unified._google?.modelVersion || unified.model || '';

  return ast;
}

/**
 * 转换统一内容为 Google Parts 格式
 * @param content 统一内容数组
 * @returns Google 内容部分数组
 */
export function transformContentToGoogleParts(content: UnifiedContent[]): GoogleContentPart[] {
  return content.map((block: any) => {
    switch (block.type) {
      case 'text':
        return {
          text: block.text
        } as GoogleTextPart;

      case 'tool_use':
        return {
          functionCall: {
            name: block.name,
            args: block.input
          },
          thoughtSignature: ''  // Google 特有字段
        } as GoogleFunctionCallPart;

      case 'tool_result':
        return {
          functionResponse: {
            name: block.toolUseId,  // 使用 toolUseId 作为函数名
            response: {
              content: block.content
            }
          },
          thoughtSignature: ''
        } as GoogleFunctionResponsePart;

      case 'thinking':
        // Google 不支持 thinking，跳过或记录警告
        console.warn('Google does not support thinking content, skipping');
        return {
          text: `[Thinking: ${block.thinking}]`
        } as GoogleTextPart;

      default:
        throw new Error(`Unsupported content type for Google: ${block.type}`);
    }
  });
}

/**
 * 转换统一 Usage 为 Google UsageMetadata
 * @param usage 统一使用量统计
 * @returns Google 使用量元数据
 */
export function transformUsageToGoogle(usage: UnifiedUsage): GoogleUsageMetadata {
  return {
    promptTokenCount: usage.inputTokens,
    candidatesTokenCount: usage.outputTokens,
    totalTokenCount: usage.totalTokens || (usage.inputTokens + usage.outputTokens),
    trafficType: usage._google?.trafficType || '0',
    promptTokensDetails: usage._google?.promptTokensDetails || [],
    candidatesTokensDetails: usage._google?.candidatesTokensDetails || [],
    thoughtsTokenCount: usage._google?.thoughtsTokenCount || 0
  };
}

/**
 * 映射统一停止原因到 Google 停止原因
 * @param reason 统一停止原因
 * @returns Google 停止原因
 */
export function mapStopReasonToGoogle(reason?: UnifiedStopReason): string {
  switch (reason) {
    case 'end_turn':
      return 'STOP';
    case 'max_tokens':
      return 'MAX_TOKENS';
    case 'content_filter':
      return 'SAFETY';
    default:
      return 'STOP';
  }
}
