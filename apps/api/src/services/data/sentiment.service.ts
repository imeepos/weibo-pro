import { Injectable } from '@sker/core';

@Injectable({ providedIn: 'root' })
export class SentimentService {
  async getRealtimeData(timeRange?: string) {
    // Mock数据 - 实时数据
    return {
      success: true,
      data: {
        totalPosts: 15000,
        positive: 45,
        negative: 20,
        neutral: 35,
        activeUsers: 8500,
        trendingTopics: [
          { topic: '人工智能', count: 1200 },
          { topic: '机器学习', count: 850 },
          { topic: '深度学习', count: 650 }
        ]
      },
      message: '获取实时数据成功'
    };
  }

  async getStatistics(timeRange?: string) {
    // Mock数据 - 统计数据
    return {
      success: true,
      data: {
        sentimentDistribution: {
          positive: 45,
          negative: 20,
          neutral: 35
        },
        dailyPosts: 2500,
        dailyUsers: 1500,
        avgSentiment: 0.65,
        sentimentTrend: '上升'
      },
      message: '获取统计数据成功'
    };
  }

  async getHotTopics(timeRange?: string) {
    // Mock数据 - 热点话题
    return {
      success: true,
      data: [
        {
          id: '1',
          topic: '人工智能技术突破',
          sentiment: 'positive',
          heat: 95,
          posts: 1200,
          users: 850
        },
        {
          id: '2',
          topic: '网络安全事件',
          sentiment: 'negative',
          heat: 88,
          posts: 980,
          users: 650
        },
        {
          id: '3',
          topic: '体育赛事盛况',
          sentiment: 'positive',
          heat: 76,
          posts: 750,
          users: 520
        }
      ],
      message: '获取热点话题成功'
    };
  }

  async getKeywords(timeRange?: string) {
    // Mock数据 - 关键词
    return {
      success: true,
      data: [
        { keyword: '人工智能', count: 1200, sentiment: 'positive' },
        { keyword: '机器学习', count: 850, sentiment: 'positive' },
        { keyword: '深度学习', count: 650, sentiment: 'positive' },
        { keyword: '网络安全', count: 580, sentiment: 'negative' },
        { keyword: '数据隐私', count: 420, sentiment: 'negative' },
        { keyword: '算法优化', count: 380, sentiment: 'positive' }
      ],
      message: '获取关键词数据成功'
    };
  }

  async getTimeSeries(timeRange?: string) {
    // Mock数据 - 时间序列
    return {
      success: true,
      data: {
        categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
        series: [
          {
            name: '正面情绪',
            data: [320, 450, 380, 520, 480, 550]
          },
          {
            name: '负面情绪',
            data: [180, 220, 250, 190, 210, 180]
          },
          {
            name: '中性情绪',
            data: [500, 430, 470, 490, 510, 470]
          }
        ]
      },
      message: '获取时间序列数据成功'
    };
  }

  async getLocations(timeRange?: string) {
    // Mock数据 - 地理位置
    return {
      success: true,
      data: {
        categories: ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'],
        series: [
          {
            name: '用户数量',
            data: [1500, 1200, 800, 700, 600, 500, 400, 300]
          }
        ]
      },
      message: '获取地理位置数据成功'
    };
  }

  async getRecentPosts(timeRange?: string) {
    // Mock数据 - 最新帖子
    return {
      success: true,
      data: [
        {
          id: 'post1',
          content: '人工智能技术的最新突破令人兴奋！期待更多创新应用。',
          sentiment: 'positive',
          author: '科技爱好者',
          timestamp: '2024-01-20T10:30:00Z',
          likes: 120,
          comments: 45
        },
        {
          id: 'post2',
          content: '网络安全事件提醒我们要加强数据保护意识。',
          sentiment: 'negative',
          author: '安全专家',
          timestamp: '2024-01-20T09:15:00Z',
          likes: 85,
          comments: 32
        },
        {
          id: 'post3',
          content: '今天的体育比赛真是精彩，球员表现都很出色！',
          sentiment: 'positive',
          author: '体育迷',
          timestamp: '2024-01-20T08:45:00Z',
          likes: 65,
          comments: 28
        }
      ],
      message: '获取最新帖子成功'
    };
  }

  async search(keyword: string, timeRange?: string) {
    // Mock数据 - 搜索
    return {
      success: true,
      data: {
        keyword: keyword,
        totalResults: 1250,
        sentimentDistribution: {
          positive: 65,
          negative: 15,
          neutral: 20
        },
        relatedTopics: [
          { topic: '机器学习', count: 350 },
          { topic: '深度学习', count: 280 },
          { topic: '神经网络', count: 220 }
        ],
        topPosts: [
          {
            id: 'search1',
            content: `关于${keyword}的最新研究进展令人印象深刻`,
            sentiment: 'positive',
            author: '研究员',
            timestamp: '2024-01-19T14:20:00Z'
          },
          {
            id: 'search2',
            content: `${keyword}技术的应用前景非常广阔`,
            sentiment: 'positive',
            author: '技术专家',
            timestamp: '2024-01-18T16:45:00Z'
          }
        ]
      },
      message: '搜索成功'
    };
  }
}