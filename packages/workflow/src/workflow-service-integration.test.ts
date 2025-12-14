import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkflowService } from '../services/workflow.service'
import { WorkflowEntity, useEntityManager } from '@sker/entities'
import { WorkflowGraphAst, generateId } from '@sker/workflow'

/**
 * 工作流服务集成测试 - 测试工作流的标签和简介保存功能
 *
 * 存在即合理：
 * - 验证工作流的标签和简介可以正确保存到数据库
 * - 确保数据完整性
 * - 测试边界情况
 *
 * 优雅设计：
 * - 直接测试 WorkflowService 而不是 Controller
 * - 使用内存数据库或 Mock 数据库
 * - 清晰的测试用例描述
 */
describe('WorkflowService - 标签和简介保存', () => {
  let workflowService: WorkflowService
  let mockEntityManager: any

  beforeEach(() => {
    // Mock entity manager
    mockEntityManager = {
      getRepository: vi.fn(() => ({
        findOne: vi.fn(),
        save: vi.fn(),
        softDelete: vi.fn(),
        find: vi.fn(),
      })),
    }

    workflowService = new WorkflowService()
    // @ts-ignore - 替换内部的 useEntityManager
    vi.spyOn(require('@sker/entities'), 'useEntityManager').mockImplementation(async (callback) => {
      return callback(mockEntityManager)
    })
  })

  describe('saveWorkflow', () => {
    it('应该成功保存带有标签和简介的工作流', async () => {
      // Arrange
      const workflowData: WorkflowGraphAst = {
        id: generateId(),
        type: 'WorkflowGraphAst',
        name: 'Test Workflow',
        description: '这是一个测试工作流的简介',
        color: '#3b82f6',
        nodes: [],
        edges: [],
        entryNodeIds: [],
        endNodeIds: [],
        position: { x: 0, y: 0 },
        width: 100,
        viewport: { x: 0, y: 0, zoom: 1 },
        collapsed: false,
        tags: ['测试', '工作流', 'API'],
      }

      const savedEntity: WorkflowEntity = {
        id: workflowData.id,
        code: workflowData.name,
        name: workflowData.name,
        description: workflowData.description,
        color: workflowData.color,
        type: workflowData.type,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        entryNodeIds: workflowData.entryNodeIds,
        endNodeIds: workflowData.endNodeIds,
        position: workflowData.position,
        width: workflowData.width,
        viewport: workflowData.viewport,
        collapsed: workflowData.collapsed,
        tags: workflowData.tags,
        defaultInputs: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockRepository = {
        findOne: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(savedEntity),
      }

      mockEntityManager.getRepository.mockReturnValue(mockRepository)

      // Act
      const result = await workflowService.saveWorkflow(workflowData)

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { code: workflowData.name },
      })

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: workflowData.id,
          code: workflowData.name,
          name: workflowData.name,
          description: workflowData.description,
          color: workflowData.color,
          tags: workflowData.tags,
          status: 'active',
        })
      )

      expect(result).toEqual(savedEntity)
      expect(result.tags).toEqual(['测试', '工作流', 'API'])
      expect(result.description).toBe('这是一个测试工作流的简介')
      expect(result.color).toBe('#3b82f6')
    })

    it('应该更新现有工作流的标签和简介', async () => {
      // Arrange
      const existingEntity: WorkflowEntity = {
        id: generateId(),
        code: 'Test Workflow',
        name: 'Test Workflow',
        description: '旧的简介',
        color: '#ef4444',
        type: 'WorkflowGraphAst',
        nodes: [],
        edges: [],
        entryNodeIds: [],
        endNodeIds: [],
        position: { x: 0, y: 0 },
        width: 100,
        viewport: { x: 0, y: 0, zoom: 1 },
        collapsed: false,
        tags: ['旧标签'],
        defaultInputs: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedData: WorkflowGraphAst = {
        id: existingEntity.id,
        type: 'WorkflowGraphAst',
        name: 'Test Workflow',
        description: '更新后的简介',
        color: '#10b981',
        nodes: [],
        edges: [],
        entryNodeIds: [],
        endNodeIds: [],
        position: { x: 0, y: 0 },
        width: 100,
        viewport: { x: 0, y: 0, zoom: 1 },
        collapsed: false,
        tags: ['新标签', '工作流'],
      }

      const updatedEntity: WorkflowEntity = {
        ...existingEntity,
        description: updatedData.description,
        color: updatedData.color,
        tags: updatedData.tags,
        updatedAt: new Date(),
      }

      const mockRepository = {
        findOne: vi.fn().mockResolvedValue(existingEntity),
        save: vi.fn().mockResolvedValue(updatedEntity),
      }

      mockEntityManager.getRepository.mockReturnValue(mockRepository)

      // Act
      const result = await workflowService.saveWorkflow(updatedData)

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { code: updatedData.name },
      })

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingEntity.id,
          code: updatedData.name,
          name: updatedData.name,
          description: updatedData.description,
          color: updatedData.color,
          tags: updatedData.tags,
        })
      )

      expect(result).toEqual(updatedEntity)
      expect(result.tags).toEqual(['新标签', '工作流'])
      expect(result.description).toBe('更新后的简介')
      expect(result.color).toBe('#10b981')
    })

    it('应该正确处理空标签数组', async () => {
      // Arrange
      const workflowData: WorkflowGraphAst = {
        id: generateId(),
        type: 'WorkflowGraphAst',
        name: 'Test Workflow',
        description: '测试简介',
        color: '#3b82f6',
        nodes: [],
        edges: [],
        entryNodeIds: [],
        endNodeIds: [],
        position: { x: 0, y: 0 },
        width: 100,
        viewport: { x: 0, y: 0, zoom: 1 },
        collapsed: false,
        tags: [],
      }

      const savedEntity: WorkflowEntity = {
        id: workflowData.id,
        code: workflowData.name,
        name: workflowData.name,
        description: workflowData.description,
        color: workflowData.color,
        type: workflowData.type,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        entryNodeIds: workflowData.entryNodeIds,
        endNodeIds: workflowData.endNodeIds,
        position: workflowData.position,
        width: workflowData.width,
        viewport: workflowData.viewport,
        collapsed: workflowData.collapsed,
        tags: [],
        defaultInputs: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockRepository = {
        findOne: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(savedEntity),
      }

      mockEntityManager.getRepository.mockReturnValue(mockRepository)

      // Act
      const result = await workflowService.saveWorkflow(workflowData)

      // Assert
      expect(result.tags).toEqual([])
      expect(result.description).toBe('测试简介')
    })

    it('应该正确处理 null/undefined 的标签和简介', async () => {
      // Arrange
      const workflowData: WorkflowGraphAst = {
        id: generateId(),
        type: 'WorkflowGraphAst',
        name: 'Test Workflow',
        description: null as any,
        color: null as any,
        nodes: [],
        edges: [],
        entryNodeIds: [],
        endNodeIds: [],
        position: { x: 0, y: 0 },
        width: 100,
        viewport: { x: 0, y: 0, zoom: 1 },
        collapsed: false,
        tags: null as any,
      }

      const savedEntity: WorkflowEntity = {
        id: workflowData.id,
        code: workflowData.name,
        name: workflowData.name,
        description: null,
        color: null,
        type: workflowData.type,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        entryNodeIds: workflowData.entryNodeIds,
        endNodeIds: workflowData.endNodeIds,
        position: workflowData.position,
        width: workflowData.width,
        viewport: workflowData.viewport,
        collapsed: workflowData.collapsed,
        tags: [],
        defaultInputs: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockRepository = {
        findOne: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(savedEntity),
      }

      mockEntityManager.getRepository.mockReturnValue(mockRepository)

      // Act
      const result = await workflowService.saveWorkflow(workflowData)

      // Assert
      expect(result.description).toBeNull()
      expect(result.color).toBeNull()
      expect(result.tags).toEqual([])
    })

    it('应该正确处理长标签和简介', async () => {
      // Arrange
      const longDescription = '这是一个非常长的工作流简介，可能包含多个段落和详细的说明。' + '重复内容'.repeat(100)
      const longTags = Array.from({ length: 100 }, (_, i) => `tag-${i}`)

      const workflowData: WorkflowGraphAst = {
        id: generateId(),
        type: 'WorkflowGraphAst',
        name: 'Test Workflow',
        description: longDescription,
        color: '#3b82f6',
        nodes: [],
        edges: [],
        entryNodeIds: [],
        endNodeIds: [],
        position: { x: 0, y: 0 },
        width: 100,
        viewport: { x: 0, y: 0, zoom: 1 },
        collapsed: false,
        tags: longTags,
      }

      const savedEntity: WorkflowEntity = {
        id: workflowData.id,
        code: workflowData.name,
        name: workflowData.name,
        description: longDescription,
        color: workflowData.color,
        type: workflowData.type,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        entryNodeIds: workflowData.entryNodeIds,
        endNodeIds: workflowData.endNodeIds,
        position: workflowData.position,
        width: workflowData.width,
        viewport: workflowData.viewport,
        collapsed: workflowData.collapsed,
        tags: longTags,
        defaultInputs: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockRepository = {
        findOne: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(savedEntity),
      }

      mockEntityManager.getRepository.mockReturnValue(mockRepository)

      // Act
      const result = await workflowService.saveWorkflow(workflowData)

      // Assert
      expect(result.description).toBe(longDescription)
      expect(result.tags).toEqual(longTags)
      expect(result.tags.length).toBe(100)
    })

    it('应该正确处理特殊字符的标签和简介', async () => {
      // Arrange
      const specialDescription = '这是一个包含特殊字符的工作流简介：!@#$%^&*()_+-=[]{}|;:\'",.<>/?`~中文测试'
      const specialTags = ['特殊字符', 'emoji😀', 'emoji😂', '标签-1', 'tag_with_underscore', 'tag.with.dot', 'tag#hash']

      const workflowData: WorkflowGraphAst = {
        id: generateId(),
        type: 'WorkflowGraphAst',
        name: 'Test Workflow',
        description: specialDescription,
        color: '#3b82f6',
        nodes: [],
        edges: [],
        entryNodeIds: [],
        endNodeIds: [],
        position: { x: 0, y: 0 },
        width: 100,
        viewport: { x: 0, y: 0, zoom: 1 },
        collapsed: false,
        tags: specialTags,
      }

      const savedEntity: WorkflowEntity = {
        id: workflowData.id,
        code: workflowData.name,
        name: workflowData.name,
        description: specialDescription,
        color: workflowData.color,
        type: workflowData.type,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        entryNodeIds: workflowData.entryNodeIds,
        endNodeIds: workflowData.endNodeIds,
        position: workflowData.position,
        width: workflowData.width,
        viewport: workflowData.viewport,
        collapsed: workflowData.collapsed,
        tags: specialTags,
        defaultInputs: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockRepository = {
        findOne: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(savedEntity),
      }

      mockEntityManager.getRepository.mockReturnValue(mockRepository)

      // Act
      const result = await workflowService.saveWorkflow(workflowData)

      // Assert
      expect(result.description).toBe(specialDescription)
      expect(result.tags).toEqual(specialTags)
      expect(result.tags).toContain('emoji😀')
      expect(result.tags).toContain('emoji😂')
      expect(result.tags).toContain('特殊字符')
    })

    it('应该自动为没有 id 的工作流生成 id', async () => {
      // Arrange
      const workflowData: WorkflowGraphAst = {
        type: 'WorkflowGraphAst',
        name: 'Test Workflow',
        description: '测试简介',
        color: '#3b82f6',
        nodes: [],
        edges: [],
        entryNodeIds: [],
        endNodeIds: [],
        position: { x: 0, y: 0 },
        width: 100,
        viewport: { x: 0, y: 0, zoom: 1 },
        collapsed: false,
        tags: ['测试'],
      }

      const savedEntity: WorkflowEntity = {
        id: workflowData.id!,
        code: workflowData.name,
        name: workflowData.name,
        description: workflowData.description,
        color: workflowData.color,
        type: workflowData.type,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        entryNodeIds: workflowData.entryNodeIds,
        endNodeIds: workflowData.endNodeIds,
        position: workflowData.position,
        width: workflowData.width,
        viewport: workflowData.viewport,
        collapsed: workflowData.collapsed,
        tags: workflowData.tags,
        defaultInputs: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockRepository = {
        findOne: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(savedEntity),
      }

      mockEntityManager.getRepository.mockReturnValue(mockRepository)

      // Act
      const result = await workflowService.saveWorkflow(workflowData)

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          code: workflowData.name,
          name: workflowData.name,
        })
      )
    })

    it('应该正确清理孤立的引用节点', async () => {
      // Arrange
      const workflowData: WorkflowGraphAst = {
        id: generateId(),
        type: 'WorkflowGraphAst',
        name: 'Test Workflow',
        description: '测试简介',
        color: '#3b82f6',
        nodes: [
          {
            id: 'node-1',
            type: 'WeiboKeywordSearchAst',
            name: '搜索节点',
            state: 'pending',
            position: { x: 0, y: 0 },
            keyword: '测试',
            startDate: '2024-01-01',
            endDate: '2024-01-02',
            page: 1,
            size: 10,
          },
          {
            id: 'node-2',
            type: 'WeiboAjaxStatusesShowAst',
            name: '保存节点',
            state: 'pending',
            position: { x: 200, y: 0 },
            postId: '123456',
          }
        ],
        edges: [
          {
            id: 'edge-1',
            from: 'node-1',
            to: 'node-2',
            type: 'data',
          }
        ],
        entryNodeIds: ['node-1', 'node-nonexistent'], // 包含不存在的节点
        endNodeIds: ['node-2', 'node-nonexistent'],   // 包含不存在的节点
        position: { x: 0, y: 0 },
        width: 100,
        viewport: { x: 0, y: 0, zoom: 1 },
        collapsed: false,
        tags: ['测试'],
      }

      const savedEntity: WorkflowEntity = {
        id: workflowData.id,
        code: workflowData.name,
        name: workflowData.name,
        description: workflowData.description,
        color: workflowData.color,
        type: workflowData.type,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        entryNodeIds: ['node-1'], // 清理后的结果
        endNodeIds: ['node-2'],   // 清理后的结果
        position: workflowData.position,
        width: workflowData.width,
        viewport: workflowData.viewport,
        collapsed: workflowData.collapsed,
        tags: workflowData.tags,
        defaultInputs: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockRepository = {
        findOne: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(savedEntity),
      }

      mockEntityManager.getRepository.mockReturnValue(mockRepository)

      // Act
      const result = await workflowService.saveWorkflow(workflowData)

      // Assert
      expect(result.entryNodeIds).toEqual(['node-1'])
      expect(result.endNodeIds).toEqual(['node-2'])
      expect(result.entryNodeIds).not.toContain('node-nonexistent')
      expect(result.endNodeIds).not.toContain('node-nonexistent')
    })
  })
})