/**
 * @fileoverview 统一抽象层流式响应聚合器
 * @description 将各厂商（Anthropic、OpenAI、Google）的流式事件聚合为统一响应格式
 * @version 2.0
 */

import { Injectable } from '@sker/core';
import { Observable, reduce, firstValueFrom, scan } from 'rxjs';
import { Ast, UnifiedResponseAst } from '../ast';
import {
  AnthropicMessageStartAst,
  AnthropicContentBlockStartAst,
  AnthropicContentBlockDeltaAst,
  AnthropicMessageDeltaAst,
  OpenAiResponseAst,
  GoogleResponseAst
} from '../ast';
import type { UnifiedResponseAccumulator } from './stream-aggregator-types';
import { createEmptyUnifiedResponse, finalizeContentBlocks } from './stream-aggregator-content';
import { aggregateOpenAiEvents } from './stream-aggregator-openai';
import {
  aggregateAnthropicEvents,
  aggregateAnthropicContentBlockStart,
  aggregateAnthropicContentBlockDelta,
  aggregateAnthropicMessageDelta
} from './stream-aggregator-anthropic';
import { aggregateGoogleEvents } from './stream-aggregator-google';

// ==================== 聚合器接口 ====================

/**
 * 统一流式响应聚合器
 * 用于将各厂商的流式事件聚合为统一的 UnifiedResponseAst
 */
@Injectable()
export class UnifiedStreamAggregator {
  /**
   * 聚合流式事件为统一的 Observable
   * @param stream$ 厂商流式 AST 事件流
   * @returns 统一的响应流
   */
  aggregateStream(stream$: Observable<Ast>): Observable<UnifiedResponseAst> {
    return stream$.pipe(
      scan((acc, ast) => this.aggregateAst(acc, ast), createEmptyUnifiedResponse()),
      reduce((acc) => {
        // 流结束时最终化内容块
        return finalizeContentBlocks(acc as any);
      })
    );
  }

  /**
   * 同步聚合流式事件，等待流完成
   * @param stream$ 厂商流式 AST 事件流
   * @returns 完整的统一响应
   */
  async aggregateStreamSync(stream$: Observable<Ast>): Promise<UnifiedResponseAst> {
    const result = await firstValueFrom(
      stream$.pipe(
        scan((acc, ast) => this.aggregateAst(acc, ast), createEmptyUnifiedResponse())
      )
    );
    return finalizeContentBlocks(result);
  }

  // ==================== 核心聚合逻辑 ====================

  /**
   * 聚合单个 AST 事件
   * @param acc 累积的统一响应
   * @param ast 当前 AST 事件
   * @returns 更新后的统一响应
   */
  private aggregateAst(
    acc: UnifiedResponseAccumulator,
    ast: Ast
  ): UnifiedResponseAccumulator {
    // OpenAI 流式事件聚合
    if (ast instanceof OpenAiResponseAst) {
      return aggregateOpenAiEvents(acc, ast);
    }

    // Anthropic 流式事件聚合
    if (ast instanceof AnthropicMessageStartAst) {
      return aggregateAnthropicEvents(acc, ast);
    }
    if (ast instanceof AnthropicContentBlockStartAst) {
      return aggregateAnthropicContentBlockStart(acc, ast);
    }
    if (ast instanceof AnthropicContentBlockDeltaAst) {
      return aggregateAnthropicContentBlockDelta(acc, ast);
    }
    if (ast instanceof AnthropicMessageDeltaAst) {
      return aggregateAnthropicMessageDelta(acc, ast);
    }

    // Google 流式事件聚合
    if (ast instanceof GoogleResponseAst) {
      return aggregateGoogleEvents(acc, ast);
    }

    return acc;
  }
}
