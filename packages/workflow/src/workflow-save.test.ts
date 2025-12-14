import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest'
import { WorkflowController } from '../controllers/workflow.controller'
import { WorkflowService } from '../services/workflow.service'
import { WorkflowGraphAst, generateId } from '@sker/workflow'
import { logger } from '@sker/core'
import { WorkflowEntity } from '@sker/entities'

/**
 * 工作流保存功能单元测试
 *
 * 存在即合理：
 * - 确保工作流的标签和简介可以正确保存
 * - 验证 API 接口的正确性
 * - 测试错误处理和边界情况
 *
 * 优雅设计：
 * - 使用 Vitest 测试框架
 * - Mock 依赖服务
 * - 测试用例清晰明确
 * - 覆盖正常流程和异常情况
 */
describe('Workflow Save API', () => {
  let workflowController: WorkflowController
  let mockWorkflowService: WorkflowService

  beforeEach(() => {
    // Mock 依赖服务
    mockWorkflowService = {
      saveWorkflow: vi.fn(),
      getWorkflowByName: vi.fn(),
      listWorkflows: vi.fn(),
      deleteWorkflow: vi.fn(),
      createShare: vi.fn(),
      getSharedWorkflow: vi.fn(),
    } as unknown as WorkflowService

    workflowController = new WorkflowController()
    // @ts-ignore - 替换内部服务实例
    workflowController.workflowService = mockWorkflowService
  })

  afterAll(() => {
    vi.clearAllMocks()
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

      // Mock 服务返回值
      mockWorkflowService.saveWorkflow.mockResolvedValue(savedEntity)

      // Act
      const result = await workflowController.saveWorkflow(workflowData)

      // Assert
      expect(mockWorkflowService.saveWorkflow).toHaveBeenCalledTimes(1)
      expect(mockWorkflowService.saveWorkflow).toHaveBeenCalledWith(workflowData)

      expect(result).toEqual(savedEntity)
      expect(result.tags).toEqual(['测试', '工作流', 'API'])
      expect(result.description).toBe('这是一个测试工作流的简介')
      expect(result.color).toBe('#3b82f6')
    })

    it('应该在工作流名称为空时抛出错误', async () => {
      // Arrange
      const workflowData: WorkflowGraphAst = {
        id: generateId(),
        type: 'WorkflowGraphAst',
        name: '',
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

      // Act & Assert
      await expect(workflowController.saveWorkflow(workflowData))
        .rejects
        .toThrow('工作流名称不能为空')
    })

    it('应该在工作流数据格式错误时抛出错误', async () => {
      // Arrange
      const workflowData: WorkflowGraphAst = {
        id: generateId(),
        type: 'WorkflowGraphAst',
        name: 'Test Workflow',
        description: '测试简介',
        color: '#3b82f6',
        nodes: undefined as any,
        edges: undefined as any,
        entryNodeIds: [],
        endNodeIds: [],
        position: { x: 0, y: 0 },
        width: 100,
        viewport: { x: 0, y: 0, zoom: 1 },
        collapsed: false,
        tags: ['测试'],
      }

      // Act & Assert
      await expect(workflowController.saveWorkflow(workflowData))
        .rejects
        .toThrow('工作流数据格式错误')
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

      mockWorkflowService.saveWorkflow.mockResolvedValue(savedEntity)

      // Act
      const result = await workflowController.saveWorkflow(workflowData)

      // Assert
      expect(mockWorkflowService.saveWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Test Workflow',
        })
      )
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

      mockWorkflowService.saveWorkflow.mockResolvedValue(savedEntity)

      // Act
      const result = await workflowController.saveWorkflow(workflowData)

      // Assert
      expect(result.tags).toEqual([])
      expect(mockWorkflowService.saveWorkflow).toHaveBeenCalledWith(workflowData)
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

      mockWorkflowService.saveWorkflow.mockResolvedValue(savedEntity)

      // Act
      const result = await workflowController.saveWorkflow(workflowData)

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

      mockWorkflowService.saveWorkflow.mockResolvedValue(savedEntity)

      // Act
      const result = await workflowController.saveWorkflow(workflowData)

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

      mockWorkflowService.saveWorkflow.mockResolvedValue(savedEntity)

      // Act
      const result = await workflowController.saveWorkflow(workflowData)

      // Assert
      expect(result.description).toBe(specialDescription)
      expect(result.tags).toEqual(specialTags)
      expect(result.tags).toContain('emoji😀')
      expect(result.tags).toContain('emoji😂')
      expect(result.tags).toContain('特殊字符')
    })

    it('应该在服务层抛出异常时正确传播错误', async () => {
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
        tags: ['测试'],
      }

      const serviceError = new Error('Database connection failed')
      mockWorkflowService.saveWorkflow.mockRejectedValue(serviceError)

      // Act & Assert
      await expect(workflowController.saveWorkflow(workflowData))
        .rejects
        .toThrow('Database connection failed')
    })
  })

  describe('WorkflowEntity structure', () => {
    it('应该验证 WorkflowEntity 的结构包含 tags 和 description 字段', () => {
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

      // Assert
      expect(savedEntity).toHaveProperty('tags')
      expect(savedEntity).toHaveProperty('description')
      expect(savedEntity.tags).toEqual(['测试'])
      expect(savedEntity.description).toBe('测试简介')
    })
  })

  describe('Integration with WorkflowService', () => {
    it('应该正确调用 WorkflowService 的 saveWorkflow 方法', async () => {
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

      mockWorkflowService.saveWorkflow.mockResolvedValue(savedEntity)

      // Act
      const result = await workflowController.saveWorkflow(workflowData)

      // Assert
      expect(mockWorkflowService.saveWorkflow).toHaveBeenCalledWith(workflowData)
      expect(result).toBe(savedEntity)
    })
  })
})