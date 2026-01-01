import { describe, it, expect } from 'vitest'
import { root } from '@sker/core'
import { KeywordsController } from '@sker/sdk'

describe('Keywords API', () => {
  it('should get word cloud data', async () => {
    const ctrl = root.get(KeywordsController)
    const data = await ctrl.getWordCloud(50)

    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })
})
