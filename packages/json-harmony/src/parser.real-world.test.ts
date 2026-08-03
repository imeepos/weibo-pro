import { describe, it, expect } from 'vitest'
import { parse } from '../src'

describe('JsonHarmonyParser', () => {
  describe('复杂真实场景', () => {
    it('解析大模型返回的混合格式', () => {
      const llmResponse = `这是大模型的回复，包含 JSON：
\`\`\`json
{
  environment_tags: ["Indoor", "Retail"],
  environment_color: {
    hue: 0.08,
    saturation: 0.05
  },
  description: "优雅的配色方案"
}
\`\`\``
      const result = parse(llmResponse)
      expect(result.data).toEqual({
        environment_tags: ['Indoor', 'Retail'],
        environment_color: {
          hue: 0.08,
          saturation: 0.05,
        },
        description: '优雅的配色方案',
      })
    })

    it('解析包含中文的复杂结构', () => {
      const json = `{
        "标题": "测试项目",
        "描述": "这是一个包含中文的测试",
        "标签": ["前端", "后端", "数据库"],
        "配置": "环境: 生产\\n版本: 1.0.0\\n启用特性:\\n  - 认证\\n  - 日志"
      }`
      const result = parse(json)
      expect(result.data).toEqual({
        标题: '测试项目',
        描述: '这是一个包含中文的测试',
        标签: ['前端', '后端', '数据库'],
        配置: {
          环境: '生产',
          版本: '1.0.0',
          启用特性: ['认证', '日志'],
        },
      })
    })
  })
})
