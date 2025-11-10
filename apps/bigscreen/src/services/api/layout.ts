/**
 * 布局配置API服务
 */

import { apiUtils as apiClient } from './client';
import type { ApiResponse } from '../../types';

export interface LayoutConfiguration {
  id: string;
  name: string;
  type: 'bigscreen' | 'frontend' | 'admin';
  layout: Record<string, any>;
  metadata?: Record<string, any> | null;
  isDefault: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLayoutPayload {
  name: string;
  type: 'bigscreen' | 'frontend' | 'admin';
  layout: Record<string, any>;
  metadata?: Record<string, any>;
  description?: string;
}

export interface UpdateLayoutPayload {
  name?: string;
  layout?: Record<string, any>;
  metadata?: Record<string, any>;
  description?: string;
}

export const LayoutAPI = {
  // 获取布局列表
  getLayouts: async (type: 'bigscreen' | 'frontend' | 'admin' = 'bigscreen'): Promise<LayoutConfiguration[]> => {
    const response = await apiClient.get<LayoutConfiguration[]>(`/layout?type=${type}`);
    return response;
  },

  // 获取默认布局
  getDefault: async (type: 'bigscreen' | 'frontend' | 'admin' = 'bigscreen'): Promise<LayoutConfiguration | null> => {
    const response = await apiClient.get<LayoutConfiguration | null>(`/layout/default?type=${type}`);
    return response;
  },

  // 获取布局详情
  getById: async (id: string): Promise<LayoutConfiguration> => {
    const response = await apiClient.get<LayoutConfiguration>(`/layout/${id}`);
    return response;
  },

  // 创建布局
  create: async (payload: CreateLayoutPayload): Promise<LayoutConfiguration> => {
    const response = await apiClient.post<LayoutConfiguration>('/layout', payload);
    return response;
  },

  // 更新布局
  update: async (id: string, payload: UpdateLayoutPayload): Promise<LayoutConfiguration> => {
    const response = await apiClient.put<LayoutConfiguration>(`/layout/${id}`, payload);
    return response;
  },

  // 删除布局
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/layout/${id}`);
  },

  // 设置为默认布局
  setAsDefault: async (id: string, type: 'bigscreen' | 'frontend' | 'admin' = 'bigscreen'): Promise<LayoutConfiguration> => {
    const response = await apiClient.put<LayoutConfiguration>(`/layout/${id}/set-default`, { type });
    return response;
  },
};
