import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SmartToolsFactory } from './SmartToolsFactory'

describe('SmartToolsFactory', () => {
  let factory: SmartToolsFactory

  beforeEach(() => {
    factory = new SmartToolsFactory()
  })

  describe('dispatch 工具 - 单端口模式', () => {
    it('应该支持单端口发射', async () => {
      const callback = vi.fn()
      factory.setDispatchCallback(callback)

      const outputContexts = [
        { property: 'endDate', title: '结束日期', description: '爬取结束日期', type: 'string' },
        { property: 'startDate', title: '开始日期', description: '爬取开始日期', type: 'string' }
      ]

      const tools = factory.createTools(outputContexts)
      expect(tools).toHaveLength(1)

      const dispatchTool = tools[0]!
      expect(dispatchTool.name).toBe('dispatch')

      // 调用单端口模式
      await dispatchTool.invoke({
        outputPort: 'endDate',
        data: '2026-01-22T15:55:25.702Z'
      })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith('endDate', '2026-01-22T15:55:25.702Z')
    })

    it('应该在没有回调时不报错', async () => {
      const outputContexts = [
        { property: 'endDate', title: '结束日期', description: '爬取结束日期', type: 'string' }
      ]

      const tools = factory.createTools(outputContexts)
      const dispatchTool = tools[0]!

      // 没有设置回调，调用不应报错
      await expect(dispatchTool.invoke({
        outputPort: 'endDate',
        data: '2026-01-22T15:55:25.702Z'
      })).resolves.not.toThrow()
    })
  })

  describe('dispatch 工具 - 批量模式', () => {
    it('应该支持批量发射多个端口', async () => {
      const callback = vi.fn()
      factory.setDispatchCallback(callback)

      const outputContexts = [
        { property: 'endDate', title: '结束日期', description: '爬取结束日期', type: 'string' },
        { property: 'startDate', title: '开始日期', description: '爬取开始日期', type: 'string' }
      ]

      const tools = factory.createTools(outputContexts)
      const dispatchTool = tools[0]!

      // 调用批量模式
      await dispatchTool.invoke({
        outputs: {
          endDate: '2026-01-22T15:55:25.702Z',
          startDate: '2026-01-22T13:47:16.000Z'
        }
      })

      // 批量模式应该只调用一次回调，传递所有端口数据
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(null, {
        endDate: '2026-01-22T15:55:25.702Z',
        startDate: '2026-01-22T13:47:16.000Z'
      })
    })

    it('批量模式应该返回所有端口的成功信息', async () => {
      const callback = vi.fn()
      factory.setDispatchCallback(callback)

      const outputContexts = [
        { property: 'endDate', title: '结束日期', description: '爬取结束日期', type: 'string' },
        { property: 'startDate', title: '开始日期', description: '爬取开始日期', type: 'string' }
      ]

      const tools = factory.createTools(outputContexts)
      const dispatchTool = tools[0]!

      const result = await dispatchTool.invoke({
        outputs: {
          endDate: '2026-01-22T15:55:25.702Z',
          startDate: '2026-01-22T13:47:16.000Z'
        }
      })

      const parsed = JSON.parse(result as string)
      expect(parsed.success).toBe(true)
      expect(parsed.mode).toBe('batch')
      expect(parsed.ports).toContain('endDate')
      expect(parsed.ports).toContain('startDate')
    })
  })

  describe('回调管理', () => {
    it('应该能清除回调', async () => {
      const callback = vi.fn()
      factory.setDispatchCallback(callback)
      factory.clearDispatchCallback()

      const outputContexts = [
        { property: 'endDate', title: '结束日期', description: '爬取结束日期', type: 'string' }
      ]

      const tools = factory.createTools(outputContexts)
      const dispatchTool = tools[0]!

      await dispatchTool.invoke({
        outputPort: 'endDate',
        data: '2026-01-22T15:55:25.702Z'
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
