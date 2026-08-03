/**
 * @fileoverview 统一抽象层反向转换器
 * @description 将 UnifiedResponseAst 转换回各厂商（Anthropic、OpenAI、Google）的原始格式
 * @version 2.0
 */

import { Ast, UnifiedResponseAst } from '../ast';
import { toAnthropicResponse } from './reverse-transformer-anthropic';
import { toOpenAIResponse } from './reverse-transformer-openai';
import { toGoogleResponse } from './reverse-transformer-google';

/**
 * 统一到原始格式反向转换器
 * 实现 "厂商 → Unified → 厂商 = 原始数据" 的无损转换
 */
export class UnifiedToOriginalTransformer {
  /**
   * 将 Unified 响应转换为原始厂商格式
   * 优先使用 _original 实现 100% 无损转换
   * @param unified 统一响应 AST
   * @returns 原始厂商格式的 AST
   */
  toOriginal(unified: UnifiedResponseAst): Ast {
    // 优先使用原始对象（100% 无损）
    if (unified._original) {
      return unified._original;
    }

    // 回退到转换
    if (!unified._provider) {
      throw new Error('Unknown provider: no _original and no _provider specified');
    }

    switch (unified._provider) {
      case 'anthropic':
        return toAnthropicResponse(unified);
      case 'openai':
        return toOpenAIResponse(unified);
      case 'google':
        return toGoogleResponse(unified);
      default:
        throw new Error(`Unknown provider: ${unified._provider}`);
    }
  }
}
