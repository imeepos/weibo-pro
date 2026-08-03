/**
 * @fileoverview 统一抽象层 - Google 请求转换器
 * @description 将 UnifiedRequestAst 转换为 Google AI API 请求格式
 * @version 2.0
 */

import { UnifiedRequestAst, UnifiedMessage, UnifiedTool } from '../ast';
import {
  GoogleRequestAst,
  GoogleContent,
  GoogleContentPart
} from '../ast';

/**
 * Google 请求转换器
 * 将统一格式转换为 Google AI API 请求格式
 */
export class UnifiedToGoogleTransformer {
  /**
   * 转换统一请求为 Google 请求
   * @param unified 统一请求 AST
   * @returns Google 请求 AST
   */
  transform(unified: UnifiedRequestAst): GoogleRequestAst {
    const ast = new GoogleRequestAst();

    // 生成配置
    ast.generationConfig = {
      maxOutputTokens: unified.maxTokens,
      temperature: unified.temperature,
      topP: unified.topP,
      topK: unified.topK
    };

    // 内容转换（过滤 system，单独处理）
    ast.contents = unified.messages
      .filter(m => m.role !== 'system')
      .map(m => this.transformMessage(m));

    // 工具转换
    if (unified.tools?.length) {
      ast.tools = [{
        functionDeclarations: unified.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }];
    }

    return ast;
  }

  /**
   * 转换统一消息为 Google 内容
   * @param msg 统一消息
   * @returns Google 内容
   */
  private transformMessage(msg: UnifiedMessage): GoogleContent {
    const role = this.mapRole(msg.role);

    if (typeof msg.content === 'string') {
      return { role, parts: [{ text: msg.content }] };
    }

    const parts: GoogleContentPart[] = msg.content.map((c: any) => {
      switch (c.type) {
        case 'text':
          return { text: c.text };
        case 'tool_use':
          return {
            functionCall: { name: c.name, args: c.input },
            thoughtSignature: ''  // Google 特有
          };
        case 'tool_result':
          return {
            functionResponse: {
              name: '',  // 需要从上下文获取
              response: { content: c.content }
            },
            thoughtSignature: ''
          };
        case 'thinking':
          throw new Error('Unsupported content type: thinking (not supported by Google)');
        case 'image':
          throw new Error('Unsupported content type: image (not supported by Google)');
        default:
          throw new Error(`Unsupported content type: ${(c as any).type}`);
      }
    });

    return { role, parts };
  }

  /**
   * 映射统一角色到 Google 角色
   * @param role 统一角色
   * @returns Google 角色
   */
  private mapRole(role: string): 'user' | 'model' | 'function' {
    switch (role) {
      case 'user': return 'user';
      case 'assistant': return 'model';
      case 'tool': return 'function';
      default: return 'user';
    }
  }
}
