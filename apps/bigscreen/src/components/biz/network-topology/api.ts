import axios from 'axios';
import type { ApiResponse, NodeInfo, TopologyData } from './types';

/**
 * 轻量级 API 客户端
 * 替代已移除的全局 apiClient，仅服务于网络拓扑仪表盘
 */
const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * 获取网络拓扑数据
 */
export const fetchTopologyData = async (
  customerId: string,
  timeout = 15000
): Promise<ApiResponse<TopologyData>> => {
  const response = await instance.get<ApiResponse<TopologyData>>('/ble-mesh/topology', {
    params: { customerId },
    timeout
  });
  return response.data;
};

/**
 * 获取节点详情
 */
export const fetchNodeDetail = async (
  nodeId: string,
  customerId: string
): Promise<ApiResponse<NodeInfo>> => {
  const response = await instance.get<ApiResponse<NodeInfo>>(`/topology/node/${nodeId}`, {
    params: { customerId }
  });
  return response.data;
};
