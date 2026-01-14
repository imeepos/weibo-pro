import { Injectable } from '@sker/core';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { StructuredToolInterface } from '@langchain/core/tools';

interface OutputContext {
  property: string
  title: string
  description: string
  type?: string
  defaultValue?: unknown
}

/**
 * SmartAstV1 工具工厂
 * 职责：创建 dispatch 工具（其他信息已在上下文中）
 */
@Injectable()
export class SmartToolsFactory {
  private dispatchCallback?: (outputPort: string, data: unknown) => void;

  setDispatchCallback(callback: (outputPort: string, data: unknown) => void): void {
    this.dispatchCallback = callback;
  }

  clearDispatchCallback(): void {
    this.dispatchCallback = undefined;
  }

  /**
   * 创建工具集
   * 注意：输入输出上下文已在系统提示词中提供，只需要 dispatch 工具
   */
  createTools(outputContexts: OutputContext[]): StructuredToolInterface[] {
    return [this.createDispatchTool(outputContexts)];
  }

  /**
   * dispatch: 分发数据到指定输出端口（唯一需要的工具）
   */
  private createDispatchTool(outputContexts: OutputContext[]): StructuredToolInterface {
    const outputList = outputContexts.map(o =>
      `- ${o.property}: ${o.title} (${o.type || 'any'})`
    ).join('\n');

    return tool(
      async ({ outputPort, data }: {
        outputPort: string;
        data: unknown;
      }) => {
        if (this.dispatchCallback) {
          this.dispatchCallback(outputPort, data);
        }

        const outputDef = outputContexts.find(o => o.property === outputPort);
        return JSON.stringify({
          success: true,
          outputPort,
          title: outputDef?.title || outputPort,
          type: outputDef?.type || typeof data
        }, null, 2);
      },
      {
        name: 'dispatch',
        description: `将数据分发到指定的输出端口。每次调用触发一次 node_emit 事件。

【可用输出端口】
${outputList || '(无)'}

【重要】
- 输出数据的类型应与输出端口的 type 匹配
- 输出数据的内容应符合输出端口的 description 描述`,
        schema: z.object({
          outputPort: z.string().describe('目标输出端口名称'),
          data: z.any().describe('要分发的数据（类型应与输出端口匹配）')
        })
      }
    );
  }
}
