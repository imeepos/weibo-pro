/**
 * 系统相关API服务
 */

import { root } from '@sker/core';
import { SystemController } from '@sker/sdk';
import type { SystemStatus as UnifiedSystemStatus } from '../../types';

// 使用统一的 SystemStatus 类型
export type SystemStatus = UnifiedSystemStatus;

// 服务状态类型
export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  lastCheck: string;
  dependencies: string[];
  errors?: string[];
}

// 性能指标类型
export interface SystemPerformance {
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    available: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
    available: number;
  };
  network: {
    incoming: number;
    outgoing: number;
    connections: number;
  };
  database: {
    connections: number;
    queryTime: number;
    cacheHitRate: number;
  };
  timestamp: string;
}

// 健康检查类型
export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  checks: HealthCheckItem[];
  timestamp: string;
  responseTime: number;
}

// 健康检查项类型
export interface HealthCheckItem {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

export const SystemAPI = {
  // 获取系统状态
  getStatus: async (): Promise<SystemStatus> => {
    const controller = root.get(SystemController);
    const status = await controller.getSystemStatus();

    // SDK 返回的是 { status, uptime, lastUpdate, components }
    // 需要适配为本地的 SystemStatus 格式
    return {
      isOnline: status.status === 'online',
      lastUpdate: status.lastUpdate,
      dataSource: {
        weibo: true,
        zhihu: false,
        news: false,
      },
      performance: {
        cpu: 0,
        memory: 0,
        network: 0,
      },
    } as SystemStatus;
  },

  // 获取性能指标
  getPerformance: async (): Promise<SystemPerformance> => {
    const controller = root.get(SystemController);
    const performance = await controller.getPerformance();

    // SDK 返回的是简化的性能指标，需要适配为本地格式
    return {
      cpu: {
        usage: performance.cpuUsage || 0,
        cores: 4,
        load: [0, 0, 0],
      },
      memory: {
        used: performance.memoryUsage || 0,
        total: 100,
        percentage: performance.memoryUsage || 0,
        available: 100 - (performance.memoryUsage || 0),
      },
      disk: {
        used: performance.diskUsage || 0,
        total: 100,
        percentage: performance.diskUsage || 0,
        available: 100 - (performance.diskUsage || 0),
      },
      network: {
        incoming: performance.networkTraffic || 0,
        outgoing: performance.networkTraffic || 0,
        connections: 0,
      },
      database: {
        connections: 0,
        queryTime: performance.responseTime || 0,
        cacheHitRate: 0,
      },
      timestamp: new Date().toISOString(),
    };
  },

  // 健康检查
  healthCheck: async (): Promise<HealthCheck> => {
    const controller = root.get(SystemController);
    const health = await controller.getHealth();

    // SDK 返回的是 SystemHealth { overall, checks, timestamp }
    // 需要适配为本地的 HealthCheck 格式
    return {
      status: health.overall === 'healthy' ? 'pass' : 'fail',
      checks: health.checks.map(check => ({
        name: check.name,
        status: check.status === 'ok' ? 'pass' : 'fail',
        message: check.message,
        responseTime: 0,
      })),
      timestamp: health.timestamp,
      responseTime: 0,
    };
  },
};