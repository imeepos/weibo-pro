import { Injectable } from '@sker/core';

@Injectable({ providedIn: 'root' })
export class ChartsService {
  async getAgeDistribution(timeRange?: string) {
    // Mock数据 - 年龄分布
    return {
      success: true,
      data: {
        categories: ['18-24', '25-34', '35-44', '45-54', '55+'],
        series: [
          {
            name: '用户数量',
            data: [1200, 1800, 1500, 800, 400]
          }
        ]
      },
      message: '获取年龄分布数据成功'
    };
  }

  async getGenderDistribution(timeRange?: string) {
    // Mock数据 - 性别分布
    return {
      success: true,
      data: {
        categories: ['男性', '女性', '未知'],
        series: [
          {
            name: '用户数量',
            data: [2800, 2200, 500]
          }
        ]
      },
      message: '获取性别分布数据成功'
    };
  }

  async getSentimentTrend(timeRange?: string) {
    // Mock数据 - 情感趋势
    return {
      success: true,
      data: {
        categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
        series: [
          {
            name: '正面',
            data: [320, 450, 380, 520, 480, 550]
          },
          {
            name: '负面',
            data: [180, 220, 250, 190, 210, 180]
          },
          {
            name: '中性',
            data: [500, 430, 470, 490, 510, 470]
          }
        ]
      },
      message: '获取情感趋势数据成功'
    };
  }

  async getGeographic(timeRange?: string) {
    // Mock数据 - 地理分布
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
      message: '获取地理分布数据成功'
    };
  }

  async getEventTypes(timeRange?: string) {
    // Mock数据 - 事件类型分布
    return {
      success: true,
      data: {
        categories: ['社会事件', '娱乐事件', '科技事件', '体育事件', '财经事件', '其他'],
        series: [
          {
            name: '事件数量',
            data: [45, 38, 25, 18, 22, 12]
          }
        ]
      },
      message: '获取事件类型分布数据成功'
    };
  }

  async getWordCloud(timeRange?: string) {
    // 词云数据 - 符合 HotTopicData 接口
    return {
      success: true,
      data: [
        { keyword: '人工智能', count: 245, weight: 100, sentiment: 'positive' as const },
        { keyword: '机器学习', count: 198, weight: 85, sentiment: 'positive' as const },
        { keyword: '深度学习', count: 167, weight: 75, sentiment: 'positive' as const },
        { keyword: '神经网络', count: 145, weight: 65, sentiment: 'neutral' as const },
        { keyword: '大数据', count: 132, weight: 60, sentiment: 'positive' as const },
        { keyword: '云计算', count: 120, weight: 55, sentiment: 'neutral' as const },
        { keyword: '区块链', count: 108, weight: 50, sentiment: 'neutral' as const },
        { keyword: '物联网', count: 95, weight: 45, sentiment: 'positive' as const },
        { keyword: '5G', count: 82, weight: 40, sentiment: 'neutral' as const },
        { keyword: '元宇宙', count: 70, weight: 35, sentiment: 'positive' as const },
        { keyword: '量子计算', count: 65, weight: 32, sentiment: 'positive' as const },
        { keyword: '边缘计算', count: 58, weight: 28, sentiment: 'neutral' as const },
        { keyword: '数字孪生', count: 52, weight: 25, sentiment: 'positive' as const },
        { keyword: '自动驾驶', count: 48, weight: 22, sentiment: 'neutral' as const },
        { keyword: '智能制造', count: 45, weight: 20, sentiment: 'positive' as const }
      ],
      message: '获取词云数据成功'
    };
  }

  async getEventCountSeries(timeRange?: string) {
    // Mock数据 - 事件计数时间序列
    return {
      success: true,
      data: {
        categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
        series: [
          {
            name: '事件数量',
            data: [120, 150, 180, 200, 220, 240]
          }
        ]
      },
      message: '获取事件计数时间序列数据成功'
    };
  }

  async getPostCountSeries(timeRange?: string) {
    // Mock数据 - 帖子计数时间序列
    return {
      success: true,
      data: {
        categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
        series: [
          {
            name: '帖子数量',
            data: [1500, 1800, 2200, 2500, 2800, 3000]
          }
        ]
      },
      message: '获取帖子计数时间序列数据成功'
    };
  }

  async getSentimentData(timeRange?: string) {
    // Mock数据 - 情感分析数据
    return {
      success: true,
      data: {
        positive: 45,
        negative: 20,
        neutral: 35,
        total: 100
      },
      message: '获取情感分析数据成功'
    };
  }

  async getBatchCharts(timeRange?: string) {
    // Mock数据 - 批量图表数据
    return {
      success: true,
      data: {
        ageDistribution: await this.getAgeDistribution(timeRange),
        genderDistribution: await this.getGenderDistribution(timeRange),
        sentimentTrend: await this.getSentimentTrend(timeRange),
        geographic: await this.getGeographic(timeRange),
        eventTypes: await this.getEventTypes(timeRange),
        wordCloud: await this.getWordCloud(timeRange)
      },
      message: '获取批量图表数据成功'
    };
  }
}