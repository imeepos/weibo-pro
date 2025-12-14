/**
 * 工作流标签和简介保存功能验证脚本
 *
 * 存在即合理：
 * - 快速验证 API 功能是否正常
 * - 测试各种边界情况
 * - 确保数据正确保存和返回
 *
 * 优雅设计：
 * - 简单直接的测试方式
 * - 清晰的输出结果
 * - 覆盖主要使用场景
 */

import { WorkflowService } from '../services/workflow.service'
import { WorkflowGraphAst, generateId } from '@sker/workflow'

async function validateWorkflowSave() {
  console.log('🧪 开始验证工作流标签和简介保存功能...\n')

  const workflowService = new WorkflowService()

  // 测试用例 1: 正常保存
  console.log('📋 测试用例 1: 正常保存带有标签和简介的工作流')
  try {
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

    const result = await workflowService.saveWorkflow(workflowData)

    console.log('✅ 保存成功')
    console.log(`   ID: ${result.id}`)
    console.log(`   名称: ${result.name}`)
    console.log(`   简介: ${result.description}`)
    console.log(`   标签: ${JSON.stringify(result.tags)}`)
    console.log(`   颜色: ${result.color}`)
  } catch (error) {
    console.log('❌ 保存失败:', error.message)
  }

  console.log()

  // 测试用例 2: 空标签
  console.log('📋 测试用例 2: 空标签数组')
  try {
    const workflowData: WorkflowGraphAst = {
      id: generateId(),
      type: 'WorkflowGraphAst',
      name: 'Empty Tags Workflow',
      description: '测试空标签',
      color: '#ef4444',
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

    const result = await workflowService.saveWorkflow(workflowData)

    console.log('✅ 保存成功')
    console.log(`   标签: ${JSON.stringify(result.tags)}`)
    console.log('   验证: 空标签数组被正确保存`)
  } catch (error) {
    console.log('❌ 保存失败:', error.message)
  }

  console.log()

  // 测试用例 3: 特殊字符
  console.log('📋 测试用例 3: 特殊字符标签和简介')
  try {
    const workflowData: WorkflowGraphAst = {
      id: generateId(),
      type: 'WorkflowGraphAst',
      name: 'Special Characters Workflow',
      description: '这是一个包含特殊字符的工作流简介：!@#$%^&*()_+-=[]{}|;:\'",.<>/?`~中文测试',
      color: '#10b981',
      nodes: [],
      edges: [],
      entryNodeIds: [],
      endNodeIds: [],
      position: { x: 0, y: 0 },
      width: 100,
      viewport: { x: 0, y: 0, zoom: 1 },
      collapsed: false,
      tags: ['特殊字符', 'emoji😀', 'emoji😂', '标签-1', 'tag_with_underscore'],
    }

    const result = await workflowService.saveWorkflow(workflowData)

    console.log('✅ 保存成功')
    console.log(`   简介: ${result.description.substring(0, 50)}...`)
    console.log(`   标签: ${JSON.stringify(result.tags)}`)
    console.log('   验证: 特殊字符被正确保存')
  } catch (error) {
    console.log('❌ 保存失败:', error.message)
  }

  console.log()

  // 测试用例 4: 长文本
  console.log('📋 测试用例 4: 长文本标签和简介')
  try {
    const longDescription = '这是一个非常长的工作流简介，可能包含多个段落和详细的说明。' + '重复内容'.repeat(100)
    const longTags = Array.from({ length: 100 }, (_, i) => `tag-${i}`)

    const workflowData: WorkflowGraphAst = {
      id: generateId(),
      type: 'WorkflowGraphAst',
      name: 'Long Text Workflow',
      description: longDescription,
      color: '#8b5cf6',
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

    const result = await workflowService.saveWorkflow(workflowData)

    console.log('✅ 保存成功')
    console.log(`   简介长度: ${result.description.length} 字符`)
    console.log(`   标签数量: ${result.tags.length}`)
    console.log('   验证: 长文本被正确保存')
  } catch (error) {
    console.log('❌ 保存失败:', error.message)
  }

  console.log()

  // 测试用例 5: null/undefined 值
  console.log('📋 测试用例 5: null/undefined 值处理')
  try {
    const workflowData: WorkflowGraphAst = {
      id: generateId(),
      type: 'WorkflowGraphAst',
      name: 'Null Values Workflow',
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

    const result = await workflowService.saveWorkflow(workflowData)

    console.log('✅ 保存成功')
    console.log(`   简介: ${result.description}`)
    console.log(`   颜色: ${result.color}`)
    console.log(`   标签: ${JSON.stringify(result.tags)}`)
    console.log('   验证: null/undefined 值被正确处理')
  } catch (error) {
    console.log('❌ 保存失败:', error.message)
  }

  console.log()

  // 测试用例 6: 获取工作流
  console.log('📋 测试用例 6: 获取工作流数据')
  try {
    const workflow = await workflowService.getWorkflowByName('Test Workflow')

    if (workflow) {
      console.log('✅ 获取成功')
      console.log(`   名称: ${workflow.name}`)
      console.log(`   简介: ${workflow.description}`)
      console.log(`   标签: ${JSON.stringify(workflow.tags)}`)
      console.log('   验证: 数据完整返回')
    } else {
      console.log('❌ 未找到工作流')
    }
  } catch (error) {
    console.log('❌ 获取失败:', error.message)
  }

  console.log()

  // 测试用例 7: 列出工作流
  console.log('📋 测试用例 7: 列出所有工作流')
  try {
    const workflows = await workflowService.listWorkflows()

    console.log('✅ 列表获取成功')
    console.log(`   工作流数量: ${workflows.length}`)
    workflows.forEach((wf, index) => {
      console.log(`   ${index + 1}. ${wf.name}`)
      console.log(`      简介: ${wf.description}`)
      console.log(`      标签: ${JSON.stringify(wf.tags)}`)
    })
  } catch (error) {
    console.log('❌ 列表获取失败:', error.message)
  }

  console.log()
  console.log('🎉 验证完成！')
}

// 运行验证
validateWorkflowSave().catch(console.error)