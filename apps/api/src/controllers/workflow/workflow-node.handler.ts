import { root } from '@sker/core';
import * as sdk from '@sker/sdk';

/**
 * 可用节点类型处理器
 *
 * 存在即合理：
 * - 遍历所有已注册的节点类型
 * - 提取节点元数据（标题、类型等）
 * - 返回统一的节点信息列表
 */
export class WorkflowNodeHandler {
  async getAvailableNodes(): Promise<sdk.WorkflowNodeInfo[]> {
    const { NODE } = await import('@sker/workflow');
    const nodeMetadatas = root.get(NODE, []);

    return nodeMetadatas.map((metadata: { target: { name: string }; title?: string; type?: string; description?: string }) => ({
      type: metadata.target.name,
      title: metadata.title || metadata.target.name,
      nodeType: metadata.type || 'basic',
      description: metadata.description,
    }));
  }
}
