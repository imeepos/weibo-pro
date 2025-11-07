import { Injectable } from '@sker/core';

@Injectable({ providedIn: 'root' })
export class UsersService {
  async getUserList(timeRange?: string) {
    return [
      {
        id: 'user1',
        name: '科技达人',
        riskLevel: '低风险',
        posts: 120,
        followers: 15000,
        influence: 95,
        lastActive: '2024-01-20T10:30:00Z'
      },
      {
        id: 'user2',
        name: 'AI专家',
        riskLevel: '中风险',
        posts: 85,
        followers: 12000,
        influence: 88,
        lastActive: '2024-01-20T09:15:00Z'
      },
      {
        id: 'user3',
        name: '数据分析师',
        riskLevel: '低风险',
        posts: 65,
        followers: 8500,
        influence: 76,
        lastActive: '2024-01-20T08:45:00Z'
      },
      {
        id: 'user4',
        name: '安全研究员',
        riskLevel: '高风险',
        posts: 45,
        followers: 6000,
        influence: 65,
        lastActive: '2024-01-19T16:20:00Z'
      }
    ];
  }

  async getRiskLevels(timeRange?: string) {
    return {
      categories: ['低风险', '中风险', '高风险'],
      series: [
        {
          name: '用户数量',
          data: [2800, 1200, 400]
        }
      ]
    };
  }

  async getStatistics(timeRange?: string) {
    return {
      totalUsers: 4400,
      activeUsers: 3200,
      avgPostsPerUser: 25.5,
      avgFollowers: 8500,
      riskDistribution: {
        low: 2800,
        medium: 1200,
        high: 400
      }
    };
  }
}