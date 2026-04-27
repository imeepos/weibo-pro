/**
 * 用户相关API服务
 */

import { root } from '@sker/core';
import { UsersController } from '@sker/sdk';
import type { UserProfile } from '../../types';
import type { BaseQueryParams, TimeRange } from './types';
import type {
  CreateDistillationTaskRequest,
  DistillationTaskSummary,
  ReviewDistillationTaskRequest,
  UserInvestigationDossier,
  UserInvestigationQueueResponse,
} from '@sker/sdk';

// 用户列表查询参数
export interface UsersListParams extends BaseQueryParams {
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  sortBy?: 'username' | 'riskScore' | 'lastActive' | 'followerCount';
  timeRange?: TimeRange;
}

// 使用统一的 UserProfile 类型
export type UserInfo = UserProfile;

// 风险等级配置类型
export interface RiskLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  name: string;
  description: string;
  color: string;
  minScore: number;
  maxScore: number;
  actionRequired: boolean;
  autoActions: string[];
}

// 用户统计数据类型
export interface UserStatistics {
  total: number;
  active: number;
  suspended: number;
  banned: number;
  monitoring: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  newUsers: {
    today: number;
    week: number;
    month: number;
  };
  activeUsers: {
    today: number;
    week: number;
    month: number;
  };
  averageRiskScore: number;
  trends: {
    totalGrowthRate: number;
    riskScoreChange: number;
    newUsersGrowthRate: number;
  };
}

// 用户列表响应类型
export interface UsersListResponse {
  users: UserInfo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export const UsersAPI = {
  // 获取用户列表
  getUsersList: async (params?: UsersListParams): Promise<UsersListResponse> => {
    const controller = root.get(UsersController);
    const response = await controller.getUserList(
      params?.timeRange,
      params?.page,
      params?.pageSize
    );
    return response as UsersListResponse;
  },

  // 获取风险等级配置
  getRiskLevels: async (params?: { timeRange?: TimeRange }): Promise<RiskLevel[]> => {
    const controller = root.get(UsersController);
    const response = await controller.getRiskLevels(params?.timeRange);
    return response as RiskLevel[];
  },

  // 获取用户统计数据
  getStatistics: async (params?: { timeRange?: TimeRange }): Promise<UserStatistics> => {
    const controller = root.get(UsersController);
    const response = await controller.getStatistics(params?.timeRange);
    return response as UserStatistics;
  },

  getInvestigationQueue: async (params?: {
    eventId?: string;
    riskLevel?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<UserInvestigationQueueResponse> => {
    const controller = root.get(UsersController);
    return await controller.getInvestigationQueue(
      params?.eventId,
      params?.riskLevel,
      params?.status,
      params?.page,
      params?.pageSize,
    );
  },

  getUserDossier: async (
    userId: string,
    params?: { eventId?: string; windowDays?: number },
  ): Promise<UserInvestigationDossier> => {
    const controller = root.get(UsersController);
    return await controller.getUserDossier(userId, params?.eventId, params?.windowDays);
  },

  createDistillationTask: async (
    userId: string,
    request?: CreateDistillationTaskRequest,
  ): Promise<DistillationTaskSummary> => {
    const controller = root.get(UsersController);
    return await controller.createDistillationTask(userId, request);
  },

  getDistillationTasks: async (userId: string): Promise<DistillationTaskSummary[]> => {
    const controller = root.get(UsersController);
    return await controller.getDistillationTasks(userId);
  },

  reviewDistillationTask: async (
    taskId: string,
    request: ReviewDistillationTaskRequest,
  ): Promise<DistillationTaskSummary> => {
    const controller = root.get(UsersController);
    return await controller.reviewDistillationTask(taskId, request);
  },
};
