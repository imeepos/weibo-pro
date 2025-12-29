import type { ToolDefinition, ToolResult } from './types';
import type { AuiStore } from './store';

export class AuiToolExecutor {
  constructor(private store: AuiStore) {}

  getTools(): { nodeId: string; tool: ToolDefinition }[] {
    const nodes = this.store.getRootNodes();
    return nodes
      .filter(n => n.props?.tool)
      .map(n => ({ nodeId: n.id, tool: n.props!.tool as ToolDefinition }));
  }

  async execute(nodeId: string, params: Record<string, unknown>): Promise<ToolResult> {
    const node = this.store.getNode(nodeId);
    const tool = node?.props?.tool as ToolDefinition | undefined;

    if (!tool) {
      return { success: false, error: `Tool not found: ${nodeId}` };
    }

    for (const p of tool.parameters || []) {
      if (p.required && params[p.name] === undefined) {
        return { success: false, error: `Missing required parameter: ${p.name}` };
      }
    }

    try {
      const data = await tool.handler(params);
      return { success: true, data };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }
}

export const createToolExecutor = (store: AuiStore) => new AuiToolExecutor(store);
