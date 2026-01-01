import { root } from '@sker/core'

// 配置 API 基础 URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

// 全局设置
beforeAll(() => {
  console.log(`Testing API at: ${API_BASE_URL}`)
})
