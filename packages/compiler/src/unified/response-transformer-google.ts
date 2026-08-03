/**
 * @fileoverview 统一抽象层 - Google 响应转换器
 * @description 将 Google AI API 响应格式转换为统一格式
 * @version 2.0
 */

import { UnifiedResponseAst, UnifiedContent, UnifiedStopReason, UnifiedUsage } from '../ast';
import {
  GoogleResponseAst,
  GoogleContentPart,
  GoogleUsageMetadata
} from '../ast';

/**
 * Google 响应转换器
 * 将 Google AI API 响应格式转换为统一格式
 */
export class GoogleToUnifiedTransformer {
  /**
   * 转换 Google 响应为统一响应
   * @param ast Google 响应 AST
   * @returns 统一响应 AST
   */
  transform(ast: GoogleResponseAst): UnifiedResponseAst {
    const unified = new UnifiedResponseAst();
    const candidate = ast.candidates?.[0];

    // 基本字段转换
    unified.model = ast.modelVersion;
    unified.role = 'assistant';
    unified._provider = 'google';
    unified._original = ast;

    // 内容转换
    if (candidate?.content?.parts) {
      unified.content = this.transformContent(candidate.content.parts);
    } else {
      unified.content = [];
    }

    // 停止原因
    unified.stopReason = this.mapStopReason(candidate?.finishReason);

    // Usage
    if (ast.usageMetadata) {
      unified.usage = this.transformUsage(ast.usageMetadata);
    }

    // 保留 Google 特有字段
    unified._google = {
      modelVersion: ast.modelVersion,
      finishReason: candidate?.finishReason
    };

    return unified;
  }

  /**
   * 转换 Google 内容部分为统一内容
   * @param parts Google 内容部分数组
   * @returns 统一内容块数组
   */
  private transformContent(parts: GoogleContentPart[]): UnifiedContent[] {
    const content: UnifiedContent[] = [];
    let toolCallIndex = 0;

    for (const part of parts) {
      // 文本部分
      if ('text' in part) {
        content.push({
          type: 'text',
          text: part.text
        });
      }
      // 函数调用部分
      else if ('functionCall' in part) {
        // Google 的 functionCall 没有 id，需要自动生成
        const generatedId = `google_fc_${Date.now()}_${toolCallIndex++}`;

        content.push({
          type: 'tool_use',
          id: generatedId,
          name: part.functionCall.name,
          input: part.functionCall.args as Record<string, unknown>
        });
      }
      // 函数响应部分
      else if ('functionResponse' in part) {
        content.push({
          type: 'tool_result',
          toolUseId: part.functionResponse.name, // 使用函数名作为 toolUseId
          content: part.functionResponse.response.content,
          isError: false
        });
      }
    }

    return content;
  }

  /**
   * 转换 Google UsageMetadata 为统一 Usage
   * @param metadata Google 使用量元数据
   * @returns 统一使用量统计
   */
  private transformUsage(metadata: GoogleUsageMetadata): UnifiedUsage {
    return {
      inputTokens: metadata.promptTokenCount,
      outputTokens: metadata.candidatesTokenCount,
      totalTokens: metadata.totalTokenCount,
      _google: {
        trafficType: metadata.trafficType,
        promptTokensDetails: metadata.promptTokensDetails,
        candidatesTokensDetails: metadata.candidatesTokensDetails,
        thoughtsTokenCount: metadata.thoughtsTokenCount
      }
    };
  }

  /**
   * 映射 Google 停止原因到统一停止原因
   * @param reason Google 停止原因
   * @returns 统一停止原因
   */
  private mapStopReason(reason?: string): UnifiedStopReason {
    switch (reason) {
      case 'STOP':
        return 'end_turn';
      case 'MAX_TOKENS':
        return 'max_tokens';
      case 'SAFETY':
        return 'content_filter';
      default:
        return 'end_turn';
    }
  }
}
