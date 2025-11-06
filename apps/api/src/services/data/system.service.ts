import { Injectable } from '@sker/core';

@Injectable({ providedIn: 'root' })
export class SystemService {
  async getSystemStatus() {
    // Mock数据 - 系统状态
    return {
      success: true,
      data: {
        status: '运行正常',
        uptime: '15天8小时32分钟',
        lastUpdate: '2024-01-20T10:30:00Z',
        components: [
          { name: 'API服务', status: '正常', uptime: '99.8%' },
          { name: '数据库', status: '正常', uptime: '99.9%' },
          { name: '缓存服务', status: '正常', uptime: '99.7%' },
          { name: '消息队列', status: '正常', uptime: '99.6%' }
        ]
      },
      message: '获取系统状态成功'
    };
  }

  async getPerformance() {
    // Mock数据 - 性能指标
    return {
      success: true,
      data: {
        cpuUsage: 45.2,
        memoryUsage: 68.5,
        diskUsage: 32.1,
        networkTraffic: 125.8,
        responseTime: 120,
        requestsPerSecond: 85.6,
        errorRate: 0.2
      },
      message: '获取性能指标成功'
    };
  }

  async getHealth() {
    // Mock数据 - 健康检查
    return {
      success: true,
      data: {
        overall: '健康',
        checks: [
          { name: '数据库连接', status: '健康', message: '连接正常' },
          { name: '缓存服务', status: '健康', message: '响应正常' },
          { name: '外部API', status: '健康', message: '调用正常' },
          { name: '文件系统', status: '健康', message: '读写正常' }
        ],
        timestamp: new Date().toISOString()
      },
      message: '健康检查完成'
    };
  }
}