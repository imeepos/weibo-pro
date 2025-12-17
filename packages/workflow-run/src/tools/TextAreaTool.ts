import { Injectable } from '@sker/core';
import { Tool } from '@sker/workflow';
import { TextAreaAst } from '@sker/workflow';

/**
 * TextAreaAst 工具类
 * 提供文本节点内容的按需获取
 */
@Injectable()
export class TextAreaTool {
  /**
   * 获取文本内容（核心工具方法）
   */
  @Tool(TextAreaAst)
  get(ast: TextAreaAst): { id: string; title: string; summary: string; content: string, emitCount: number, } {
    return {
      id: ast.id,
      title: ast.name || '未命名文本',
      summary: ast.description || '',
      content: ast.output || '（内容为空）',
      emitCount: ast.emitCount || 0
    };
  }
}
