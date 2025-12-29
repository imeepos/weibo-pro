export interface AuiNode {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: AuiNode[];
  metadata?: AuiMetadata;
}

export interface AuiMetadata {
  label?: string;
  description?: string;
  importance?: 'high' | 'medium' | 'low';
  context?: Record<string, unknown>;
  visible?: boolean | (() => boolean);
}

export interface AuiSerializer<T = unknown> {
  serialize(node: T): AuiNode | null;
  deserialize?(node: AuiNode): T | null;
}

export interface AuiContext {
  nodes: AuiNode[];
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type AuiSerializerFactory<T = unknown> = (
  type: string
) => AuiSerializer<T> | undefined;

export type NodeDescriber = (node: AuiNode) => string;

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required?: boolean;
  description?: string;
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: ToolParameter[];
  handler: (params: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
