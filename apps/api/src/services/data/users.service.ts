import { Injectable } from '@sker/core';

@Injectable({ providedIn: 'root' })
export class UsersService {
  async getUserList(timeRange?: string) {
    return {
      users: [
        {
          id: 'user1',
          username: 'tech_expert',
          nickname: '科技达人',
          followers: 15000,
          following: 2300,
          posts: 120,
          verified: true,
          location: '北京市',
          riskLevel: 'low' as const,
          activities: {
            posts: 45,
            comments: 89
          },
          sentiment: {
            positive: 75,
            negative: 10,
            neutral: 15
          },
          tags: ['科技', '互联网', 'AI'],
          lastActive: '2024-01-20T10:30:00Z'
        },
        {
          id: 'user2',
          username: 'ai_researcher',
          nickname: 'AI专家',
          followers: 12000,
          following: 1800,
          posts: 85,
          verified: true,
          location: '上海市',
          riskLevel: 'medium' as const,
          activities: {
            posts: 32,
            comments: 67
          },
          sentiment: {
            positive: 60,
            negative: 25,
            neutral: 15
          },
          tags: ['AI', '机器学习', '深度学习'],
          lastActive: '2024-01-20T09:15:00Z'
        },
        {
          id: 'user3',
          username: 'data_analyst',
          nickname: '数据分析师',
          followers: 8500,
          following: 1200,
          posts: 65,
          verified: false,
          location: '广州市',
          riskLevel: 'low' as const,
          activities: {
            posts: 28,
            comments: 52
          },
          sentiment: {
            positive: 70,
            negative: 15,
            neutral: 15
          },
          tags: ['数据分析', '可视化', 'Python'],
          lastActive: '2024-01-20T08:45:00Z'
        },
        {
          id: 'user4',
          username: 'security_pro',
          nickname: '安全研究员',
          followers: 6000,
          following: 800,
          posts: 45,
          verified: true,
          location: '深圳市',
          riskLevel: 'high' as const,
          activities: {
            posts: 18,
            comments: 38
          },
          sentiment: {
            positive: 40,
            negative: 45,
            neutral: 15
          },
          tags: ['网络安全', '渗透测试', '漏洞挖掘'],
          lastActive: '2024-01-19T16:20:00Z'
        },
        {
          id: 'user5',
          username: 'blockchain_dev',
          nickname: '区块链开发者',
          followers: 9500,
          following: 1500,
          posts: 95,
          verified: true,
          location: '杭州市',
          riskLevel: 'medium' as const,
          activities: {
            posts: 38,
            comments: 72
          },
          sentiment: {
            positive: 65,
            negative: 20,
            neutral: 15
          },
          tags: ['区块链', 'Web3', '智能合约'],
          lastActive: '2024-01-20T11:00:00Z'
        }
      ],
      total: 5,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasMore: false
    };
  }

  async getRiskLevels(timeRange?: string) {
    return [
      {
        level: 'low' as const,
        name: '低风险',
        description: '用户行为正常，无异常活动',
        color: '#10b981',
        minScore: 0,
        maxScore: 30,
        actionRequired: false,
        autoActions: []
      },
      {
        level: 'medium' as const,
        name: '中风险',
        description: '用户存在部分异常行为，需要关注',
        color: '#f59e0b',
        minScore: 31,
        maxScore: 60,
        actionRequired: true,
        autoActions: ['监控', '记录']
      },
      {
        level: 'high' as const,
        name: '高风险',
        description: '用户存在明显异常行为，需要立即处理',
        color: '#ef4444',
        minScore: 61,
        maxScore: 100,
        actionRequired: true,
        autoActions: ['监控', '限制', '通知管理员']
      }
    ];
  }

  async getStatistics(timeRange?: string) {
    return {
      total: 5,
      active: 4,
      suspended: 0,
      banned: 0,
      monitoring: 2,
      riskDistribution: {
        low: 2,
        medium: 2,
        high: 1,
        critical: 0
      },
      newUsers: {
        today: 0,
        week: 2,
        month: 5
      },
      activeUsers: {
        today: 4,
        week: 5,
        month: 5
      },
      averageRiskScore: 35.5,
      trends: {
        totalGrowthRate: 0.15,
        riskScoreChange: -2.3,
        newUsersGrowthRate: 0.25
      }
    };
  }
}