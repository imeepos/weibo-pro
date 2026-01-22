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
 *
 * 支持两种发射模式：
 * 1. 单端口模式：dispatch({ outputPort: 'xxx', data: ... })
 * 2. 批量模式：dispatch({ outputs: { port1: data1, port2: data2 } })
 */
@Injectable()
export class SmartToolsFactory {
  private dispatchCallback?: (outputPort: string | null, data: unknown) => void;

  /**
   * 设置分发回调
   * @param callback 回调函数
   *   - 单端口模式：callback(outputPort, data)
   *   - 批量模式：callback(null, { port1: data1, port2: data2 })
   */
  setDispatchCallback(callback: (outputPort: string | null, data: unknown) => void): void {
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
   * dispatch: 分发数据到指定输出端口
   *
   * 支持两种模式：
   * 1. 单端口模式：{ outputPort: 'xxx', data: ... }
   * 2. 批量模式：{ outputs: { port1: data1, port2: data2 } }（推荐，减少事件数量）
   */
  private createDispatchTool(outputContexts: OutputContext[]): StructuredToolInterface {
    const outputList = outputContexts.map(o =>
      `- ${o.property}: ${o.title} (${o.type || 'any'})`
    ).join('\n');

    return tool(
      async (input: {
        outputPort?: string;
        data?: unknown;
        outputs?: Record<string, unknown>;
      }) => {
        // 批量模式：outputs 字段存在
        if (input.outputs && typeof input.outputs === 'object') {
          if (this.dispatchCallback) {
            this.dispatchCallback(null, input.outputs);
          }

          const ports = Object.keys(input.outputs);
          return JSON.stringify({
            success: true,
            mode: 'batch',
            ports,
            message: `已批量分发到 ${ports.length} 个端口: ${ports.join(', ')}`
          }, null, 2);
        }

        // 单端口模式：outputPort + data
        if (input.outputPort) {
          if (this.dispatchCallback) {
            this.dispatchCallback(input.outputPort, input.data);
          }

          const outputDef = outputContexts.find(o => o.property === input.outputPort);
          return JSON.stringify({
            success: true,
            mode: 'single',
            outputPort: input.outputPort,
            title: outputDef?.title || input.outputPort,
            type: outputDef?.type || typeof input.data
          }, null, 2);
        }

        return JSON.stringify({
          success: false,
          error: '请提供 outputPort + data（单端口模式）或 outputs（批量模式）'
        }, null, 2);
      },
      {
        name: 'dispatch',
        description: `将数据分发到输出端口。支持两种模式：

【模式 1：单端口】适合只需要输出一个端口的场景，如：执行某一个分支
  dispatch({ outputPort: "端口名", data: 数据 })

【模式 2：批量】推荐！一次发射多个端口，减少事件数量
  dispatch({ outputs: { 端口1: 数据1, 端口2: 数据2 } })

【可用输出端口】
${outputList || '(无)'}

【重要】
- 优先使用批量模式，一次性输出所有端口数据
- 输出数据的类型应与输出端口的 type 匹配`,
        schema: z.object({
          outputPort: z.string().optional().describe('单端口模式：目标输出端口名称'),
          data: z.any().optional().describe('单端口模式：要分发的数据'),
          outputs: z.record(z.string(), z.any()).optional().describe('批量模式：{ 端口名: 数据 } 的映射对象')
        })
      }
    );
  }
}
