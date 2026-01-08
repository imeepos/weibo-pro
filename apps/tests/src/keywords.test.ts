import { describe, it, expect } from 'vitest'
import { root } from '@sker/core'
import { KeywordsController } from '@sker/sdk'

describe.skip('Keywords API', () => {
  // 跳过此测试：需要 API 服务器运行
  it('should get word cloud data', async () => {
    const ctrl = root.get(KeywordsController)
    const data = await ctrl.getWordCloud(50)

    expect(Array.isArray(data)).toBe(true)
    // 数据库可能为空，只验证返回格式正确
    expect(data.length).toBeGreaterThanOrEqual(0)
  })
})
