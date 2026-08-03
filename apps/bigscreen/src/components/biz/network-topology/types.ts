import type { Node, Edge } from 'vis-network/standalone';

/**
 * 网络拓扑节点
 * 在 vis-network Node 基础上补充业务字段
 */
export interface NetworkNode extends Node {
  type?: string;
  friendlyName?: string;
  nodeType?: string;
  gatewayNodeIds?: string[];
  connectivity?: string[];
  level?: number;
}

/**
 * 网络拓扑边
 */
export interface NetworkEdge extends Edge {
  width?: number;
  color?: { color: string };
  smooth?: boolean;
  arrows?: { to: boolean };
}

/**
 * 拓扑数据（后端 /ble-mesh/topology 返回结构）
 */
export interface TopologyData {
  data: Array<{
    Source: string;
    target: string;
    size?: number;
  }>;
}

/**
 * 节点详情信息（点击节点后展示/回调）
 */
export interface NodeInfo {
  nodeId: string;
  friendlyName?: string;
  nodeType: string;
  gatewayNodeIds?: string[];
  connectivity?: string[];
  [key: string]: any;
}

/**
 * 网络拓扑仪表盘组件 Props
 */
export interface NetworkTopologyDashboardProps {
  className?: string;
  customerId?: string;
  width?: string | number;
  height?: string | number;
  onNodeClick?: (nodeInfo: NodeInfo) => void;
}

/**
 * 统计信息
 */
export interface TopologyStatistics {
  efdTotal: number;
  appTotal: number;
  iotTotal: number;
  cloudTotal: number;
}

/**
 * API 响应封装
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
  timestamp?: number;
}
