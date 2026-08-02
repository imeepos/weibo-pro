/**
 * BLE Mesh API
 *
 * TODO: 此文件需要重构
 * 1. 在 packages/sdk/src/controllers 创建 ble-mesh.controller.ts
 * 2. 使用 @sker/sdk 的 BleMeshController 替代当前的 apiClient 调用
 * 3. 参考 charts.ts、overview.ts 等文件的重构方式
 *
 * 当前暂时禁用所有方法，因为 apiClient 已被移除
 */

export const BLE_MESH_API_AVAILABLE = false;
export const BLE_MESH_UNAVAILABLE_MESSAGE = 'BLE Mesh 页面尚未接入真实后端，当前只保留占位视图。';
export const BLE_MESH_UNAVAILABLE_GUIDANCE = '要启用该页面，需要补齐 BleMeshController 与 /ble-mesh/* 后端契约。';

class BleMeshUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BleMeshUnavailableError';
  }
}

const createBleMeshUnavailableError = (method: 'GET' | 'POST', url: string) =>
  new BleMeshUnavailableError(
    `${BLE_MESH_UNAVAILABLE_MESSAGE} ${BLE_MESH_UNAVAILABLE_GUIDANCE} (${method} ${url})`
  );

// apiClient 已被移除，临时提供占位实现
const apiClient = {
  get: async (url: string, _config?: any): Promise<any> => {
    throw createBleMeshUnavailableError('GET', url)
  },
  post: async (url: string, _data?: any): Promise<any> => {
    throw createBleMeshUnavailableError('POST', url)
  }
};
import {
  BleMeshApiResponse,
  BleMeshTopologyData,
  BleMeshQueryParams,
  DeviceInfo
} from '../../types/bleMesh';

/**
 * 获取BLE Mesh拓扑数据
 */
export const getBleMeshTopologyData = async (
  params: BleMeshQueryParams
): Promise<BleMeshApiResponse<BleMeshTopologyData[]>> => {
  try {
    const response = await apiClient.get('/ble-mesh/topology', {
      params: {
        customerId: params.customerId,
        type: params.type,
        refresh: params.refresh || false
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('获取BLE Mesh拓扑数据失败:', error);
    throw error;
  }
};

/**
 * 获取设备详细信息
 */
export const getDeviceDetails = async (
  deviceId: string
): Promise<BleMeshApiResponse<DeviceInfo>> => {
  try {
    const response = await apiClient.get(`/ble-mesh/device/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error('获取设备详细信息失败:', error);
    throw error;
  }
};

/**
 * 刷新拓扑数据
 */
export const refreshTopologyData = async (
  customerId: string,
  type: 'reachability' | 'assignment'
): Promise<BleMeshApiResponse<BleMeshTopologyData[]>> => {
  try {
    const response = await apiClient.post('/ble-mesh/refresh', {
      customerId,
      type
    });
    return response.data;
  } catch (error) {
    console.error('刷新拓扑数据失败:', error);
    throw error;
  }
};

/**
 * 搜索客户设备
 */
export const searchCustomerDevices = async (
  customerId: string
): Promise<BleMeshApiResponse<{ reachability: BleMeshTopologyData[]; assignment: BleMeshTopologyData[] }>> => {
  try {
    const response = await apiClient.get(`/ble-mesh/customer/${customerId}`);
    return response.data;
  } catch (error) {
    console.error('搜索客户设备失败:', error);
    throw error;
  }
};
