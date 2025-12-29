import type {
  AuiNode,
  AuiSerializer,
  AuiContext,
  NodeDescriber,
  ToolDefinition,
} from './types';

const describers: Record<string, NodeDescriber> = {
  Button: (n) => {
    const tool = n.props?.tool as ToolDefinition | undefined;
    if (tool) {
      const label = n.props?.label || tool.name;
      const params = tool.parameters?.map(p =>
        `${p.name} (${p.type}${p.required ? ', 必填' : ''}): ${p.description || ''}`
      ).join('\n    - ') || '无参数';
      return `按钮 "${label}"（工具：${tool.name}）\n    参数：\n    - ${params}`;
    }
    const label = n.props?.label || n.props?.text || '按钮';
    const disabled = n.props?.disabled ? '，已禁用' : '';
    const importance = n.metadata?.importance === 'high' ? '（重要）' : '';
    return `按钮 "${label}"${disabled}${importance}`;
  },
  Form: (n) => {
    const fields = (n.props?.fields as string[]) || [];
    const required = (n.props?.requiredFields as string[]) || [];
    const desc = n.metadata?.description || '表单';
    return `${desc}，包含字段：${fields.join('、')}${required.length ? `，必填：${required.join('、')}` : ''}`;
  },
  Input: (n) => {
    const label = n.props?.label || n.props?.placeholder || '输入框';
    const type = n.props?.type || 'text';
    const required = n.props?.required ? '（必填）' : '';
    return `输入框 "${label}"，类型：${type}${required}`;
  },
  Select: (n) => {
    const label = n.props?.label || '下拉选择';
    const options = (n.props?.options as string[]) || [];
    return `下拉选择 "${label}"，选项：${options.slice(0, 5).join('、')}${options.length > 5 ? '等' : ''}`;
  },
  Table: (n) => {
    const columns = (n.props?.columns as string[]) || [];
    const rowCount = n.props?.rowCount || '未知';
    return `数据表格，列：${columns.join('、')}，共 ${rowCount} 行`;
  },
  Card: (n) => `卡片 "${n.props?.title || '卡片'}"`,
  Modal: (n) => {
    const title = n.props?.title || '弹窗';
    const visible = n.props?.visible ? '已打开' : '已关闭';
    return `弹窗 "${title}"，${visible}`;
  },
  List: (n) => {
    const itemCount = n.props?.itemCount || (n.props?.items as unknown[])?.length || 0;
    return `列表，共 ${itemCount} 项`;
  },
};

const defaultDescriber: NodeDescriber = (n) => {
  const desc = n.metadata?.description || n.metadata?.label || n.type;
  return `${n.type} (${n.id}): ${desc}`;
};

export class AuiContextSerializer {
  private serializers = new Map<string, AuiSerializer>();
  private customDescribers = new Map<string, NodeDescriber>();

  register<T>(type: string, serializer: AuiSerializer<T>): void {
    this.serializers.set(type, serializer);
  }

  unregister(type: string): void {
    this.serializers.delete(type);
  }

  registerDescriber(type: string, describer: NodeDescriber): void {
    this.customDescribers.set(type, describer);
  }

  serialize(type: string, value: unknown): AuiNode | null {
    const serializer = this.serializers.get(type);
    return serializer ? serializer.serialize(value) : null;
  }

  deserialize<T>(node: AuiNode): T | null {
    const serializer = this.serializers.get(node.type);
    return (serializer?.deserialize?.(node) as T) ?? null;
  }

  serializeContext(nodes: AuiNode[], metadata?: Record<string, unknown>): string {
    const context: AuiContext = {
      nodes,
      timestamp: Date.now(),
      metadata,
    };
    return JSON.stringify(context, null, 2);
  }

  deserializeContext(json: string): AuiContext | null {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  toNaturalLanguage(nodes: AuiNode[], pageName?: string): string {
    const visibleNodes = nodes.filter(n => {
      const visible = n.metadata?.visible;
      if (visible === undefined) return true;
      return typeof visible === 'function' ? visible() : visible;
    });

    if (visibleNodes.length === 0) return '当前页面没有可见元素。';

    const lines: string[] = [];

    if (pageName) {
      lines.push(`# ${pageName}\n`);
    }

    visibleNodes.forEach((node, i) => {
      const describer = this.customDescribers.get(node.type)
        || describers[node.type]
        || defaultDescriber;
      lines.push(`${i + 1}. ${describer(node)}`);
    });

    return lines.join('\n');
  }
}

export const contextSerializer = new AuiContextSerializer();
