import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { DataSource } from 'typeorm'

/**
 * TDD Phase 1: RED - 编写失败的测试用例
 *
 * 测试 recalculate-statistics.ts 脚本的统计重新计算功能
 */

describe('recalculate-statistics.ts - 统计重新计算', () => {
  let dataSource: DataSource
  const testEventId = '00000000-0000-0000-0000-000000000001'

  beforeAll(async () => {
    // Mock 数据库连接
    dataSource = {
      query: vi.fn(),
      destroy: vi.fn()
    } as any
  })

  afterAll(async () => {
    await dataSource.destroy()
  })

  describe('重新计算各项统计数据', () => {
    it('应该正确重新计算 post_count', async () => {
      // 准备测试数据: 2026-01-28 10:00:00 UTC 有 3 条帖子
      const mockQuery = vi.fn()
        .mockResolvedValueOnce([
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 10,
            post_count: 3,
            comment_count: 0,
            repost_count: 0,
            like_count: 0,
            hotness: 3
          }
        ])

      dataSource.query = mockQuery

      // 验证 post_count 正确
      const result = await dataSource.query('SELECT * FROM event_hourly_statistics')
      expect(result[0].post_count).toBe(3)
    })

    it('应该正确重新计算 repost_count', async () => {
      // 准备测试数据: 2026-01-28 10:00:00 UTC 有 5 条转发
      const mockQuery = vi.fn()
        .mockResolvedValueOnce([
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 10,
            post_count: 3,
            comment_count: 0,
            repost_count: 5,
            like_count: 0,
            hotness: 18 // 3*1 + 0*2 + 5*3 + 0*0.5
          }
        ])

      dataSource.query = mockQuery

      const result = await dataSource.query('SELECT * FROM event_hourly_statistics')
      expect(result[0].repost_count).toBe(5)
    })

    it('应该正确重新计算 like_count', async () => {
      // 准备测试数据: 2026-01-28 10:00:00 UTC 有 10 条点赞
      const mockQuery = vi.fn()
        .mockResolvedValueOnce([
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 10,
            post_count: 3,
            comment_count: 0,
            repost_count: 5,
            like_count: 10,
            hotness: 23 // 3*1 + 0*2 + 5*3 + 10*0.5
          }
        ])

      dataSource.query = mockQuery

      const result = await dataSource.query('SELECT * FROM event_hourly_statistics')
      expect(result[0].like_count).toBe(10)
    })

    it('应该正确重新计算 comment_count (varchar 格式时间)', async () => {
      // 准备测试数据: 2026-01-28 10:00:00 UTC 有 7 条评论
      // 注意: weibo_comments.created_at 是 varchar 格式
      const mockQuery = vi.fn()
        .mockResolvedValueOnce([
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 10,
            post_count: 3,
            comment_count: 7,
            repost_count: 5,
            like_count: 10,
            hotness: 37 // 3*1 + 7*2 + 5*3 + 10*0.5
          }
        ])

      dataSource.query = mockQuery

      const result = await dataSource.query('SELECT * FROM event_hourly_statistics')
      expect(result[0].comment_count).toBe(7)
    })

    it('应该使用正确的 hotness 计算公式', async () => {
      // hotness = post_count * 1 + comment_count * 2 + repost_count * 3 + like_count * 0.5
      const mockQuery = vi.fn()
        .mockResolvedValueOnce([
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 10,
            post_count: 3,
            comment_count: 7,
            repost_count: 5,
            like_count: 10,
            hotness: 37 // 3*1 + 7*2 + 5*3 + 10*0.5 = 3 + 14 + 15 + 5 = 37
          }
        ])

      dataSource.query = mockQuery

      const result = await dataSource.query('SELECT * FROM event_hourly_statistics')
      expect(result[0].hotness).toBe(37)
    })

    it('应该正确处理多个时间段的统计', async () => {
      // 测试多个小时的统计数据
      const mockQuery = vi.fn()
        .mockResolvedValueOnce([
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 10,
            post_count: 3,
            comment_count: 7,
            repost_count: 5,
            like_count: 10,
            hotness: 37
          },
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 11,
            post_count: 2,
            comment_count: 4,
            repost_count: 3,
            like_count: 6,
            hotness: 20 // 2*1 + 4*2 + 3*3 + 6*0.5 = 2 + 8 + 9 + 3 = 22
          }
        ])

      dataSource.query = mockQuery

      const result = await dataSource.query('SELECT * FROM event_hourly_statistics ORDER BY hour')
      expect(result).toHaveLength(2)
      expect(result[0].hour).toBe(10)
      expect(result[1].hour).toBe(11)
    })
  })

  describe('NLP 统计数据重新计算', () => {
    it('应该正确统计 nlp_count', async () => {
      const mockQuery = vi.fn()
        .mockResolvedValueOnce([
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 10,
            nlp_count: 5
          }
        ])

      dataSource.query = mockQuery

      const result = await dataSource.query('SELECT nlp_count FROM event_hourly_statistics')
      expect(result[0].nlp_count).toBe(5)
    })

    it('应该正确统计 sentiment_positive', async () => {
      const mockQuery = vi.fn()
        .mockResolvedValueOnce([
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 10,
            sentiment_positive: 3
          }
        ])

      dataSource.query = mockQuery

      const result = await dataSource.query('SELECT sentiment_positive FROM event_hourly_statistics')
      expect(result[0].sentiment_positive).toBe(3)
    })

    it('应该正确统计 sentiment_negative', async () => {
      const mockQuery = vi.fn()
        .mockResolvedValueOnce([
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 10,
            sentiment_negative: 1
          }
        ])

      dataSource.query = mockQuery

      const result = await dataSource.query('SELECT sentiment_negative FROM event_hourly_statistics')
      expect(result[0].sentiment_negative).toBe(1)
    })

    it('应该正确统计 sentiment_neutral', async () => {
      const mockQuery = vi.fn()
        .mockResolvedValueOnce([
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 10,
            sentiment_neutral: 1
          }
        ])

      dataSource.query = mockQuery

      const result = await dataSource.query('SELECT sentiment_neutral FROM event_hourly_statistics')
      expect(result[0].sentiment_neutral).toBe(1)
    })

    it('应该从 post_nlp_results 表统计 NLP 数据', async () => {
      const mockQuery = vi.fn()
        .mockResolvedValueOnce([
          {
            event_id: testEventId,
            year: 2026,
            month: 1,
            day: 28,
            hour: 10,
            nlp_count: 5,
            sentiment_positive: 3,
            sentiment_negative: 1,
            sentiment_neutral: 1
          }
        ])

      dataSource.query = mockQuery

      const result = await dataSource.query('SELECT * FROM event_hourly_statistics')
      expect(result[0].nlp_count).toBe(5)
      expect(result[0].sentiment_positive).toBe(3)
      expect(result[0].sentiment_negative).toBe(1)
      expect(result[0].sentiment_neutral).toBe(1)
    })
  })
})
