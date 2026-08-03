/**
 * TDD 测试: RunConfigDialog 抽取的纯工具函数
 *
 * 从 RunConfigDialog.tsx 拆分出的工具函数，锁定现有行为，保证重构后行为不变。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  collectInputsFromWorkflow,
  findEntryNodes,
  formatLabel,
  getPlaceholder,
  groupFieldsByNode,
  inferFieldType,
} from './run-config-dialog.utils'

vi.mock('@sker/workflow', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    resolveConstructor: vi.fn(),
    getInputMetadata: vi.fn(),
  }
})

import { getInputMetadata, resolveConstructor } from '@sker/workflow'

const mockResolveConstructor = resolveConstructor as unknown as ReturnType<typeof vi.fn>
const mockGetInputMetadata = getInputMetadata as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockResolveConstructor.mockReset()
  mockGetInputMetadata.mockReset()
})

describe('findEntryNodes', () => {
  it('workflow 无效时返回空数组', () => {
    expect(findEntryNodes(null as any)).toEqual([])
    expect(findEntryNodes(undefined as any)).toEqual([])
    expect(findEntryNodes({} as any)).toEqual([])
  })

  it('优先使用 entryNodeIds 确定入口节点', () => {
    const workflow = {
      entryNodeIds: ['n2'],
      nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
      edges: [],
    }
    const result = findEntryNodes(workflow as any)
    expect(result.map((n: any) => n.id)).toEqual(['n2'])
  })

  it('entryNodeIds 为空时回退到无入边节点', () => {
    const workflow = {
      nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2' },
        { id: 'e2', from: 'n2', to: 'n3' },
      ],
    }
    const result = findEntryNodes(workflow as any)
    expect(result.map((n: any) => n.id)).toEqual(['n1'])
  })
})

describe('collectInputsFromWorkflow', () => {
  it('workflow 缺少 nodes/edges 时返回空对象', () => {
    expect(collectInputsFromWorkflow(null as any, {})).toEqual({})
    expect(collectInputsFromWorkflow({} as any, {})).toEqual({})
  })

  it('根据入口节点元数据收集 fullKey 输入', () => {
    const ctor = class MockNode {}
    mockResolveConstructor.mockReturnValue(ctor)
    mockGetInputMetadata.mockReturnValue([{ propertyKey: 'keyword', defaultValue: '默认词' }])

    const workflow = {
      entryNodeIds: ['n1'],
      nodes: [{ id: 'n1' }, { id: 'n2' }],
      edges: [],
    }
    const result = collectInputsFromWorkflow(workflow as any, {})
    expect(result).toEqual({ 'n1.keyword': '默认词' })
    expect(mockResolveConstructor).toHaveBeenCalledWith({ id: 'n1' })
    expect(mockResolveConstructor).not.toHaveBeenCalledWith({ id: 'n2' })
  })

  it('值优先级: fullKey > propKey > 节点当前值 > 装饰器默认值', () => {
    const ctor = class MockNode {}
    mockResolveConstructor.mockReturnValue(ctor)
    mockGetInputMetadata.mockReturnValue([{ propertyKey: 'keyword', defaultValue: '装饰器默认值' }])

    // 节点有值时用节点值
    let result = collectInputsFromWorkflow(
      { nodes: [{ id: 'n1', keyword: '节点值' }], edges: [] } as any,
      {}
    )
    expect(result).toEqual({ 'n1.keyword': '节点值' })

    // 无节点值时用装饰器默认值
    result = collectInputsFromWorkflow({ nodes: [{ id: 'n1' }], edges: [] } as any, {})
    expect(result).toEqual({ 'n1.keyword': '装饰器默认值' })

    // propKey 简化格式覆盖节点值
    result = collectInputsFromWorkflow(
      { nodes: [{ id: 'n1', keyword: '节点值' }], edges: [] } as any,
      { keyword: '简化值' }
    )
    expect(result).toEqual({ 'n1.keyword': '简化值' })

    // fullKey 完整格式覆盖 propKey
    result = collectInputsFromWorkflow(
      { nodes: [{ id: 'n1', keyword: '节点值' }], edges: [] } as any,
      { keyword: '简化值', 'n1.keyword': '完整值' }
    )
    expect(result).toEqual({ 'n1.keyword': '完整值' })
  })

  it('finalValue 为 undefined 时跳过该字段', () => {
    mockResolveConstructor.mockReturnValue(class MockNode {})
    mockGetInputMetadata.mockReturnValue([{ propertyKey: 'keyword' }])

    const result = collectInputsFromWorkflow({ nodes: [{ id: 'n1' }], edges: [] } as any, {})
    expect(result).toEqual({})
  })

  it('getInputMetadata 返回单个对象时也能处理', () => {
    mockResolveConstructor.mockReturnValue(class MockNode {})
    mockGetInputMetadata.mockReturnValue({ propertyKey: 'keyword', defaultValue: '单值' })

    const result = collectInputsFromWorkflow({ nodes: [{ id: 'n1' }], edges: [] } as any, {})
    expect(result).toEqual({ 'n1.keyword': '单值' })
  })

  it('resolveConstructor 抛错时不影响其他节点收集', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResolveConstructor.mockImplementation((node: any) => {
      if (node.id === 'n1') {
        throw new Error('boom')
      }
      return class MockNode {}
    })
    mockGetInputMetadata.mockReturnValue([{ propertyKey: 'keyword', defaultValue: '值' }])

    const result = collectInputsFromWorkflow(
      { nodes: [{ id: 'n1' }, { id: 'n2' }], edges: [] } as any,
      {}
    )
    expect(result).toEqual({ 'n2.keyword': '值' })
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})

describe('inferFieldType', () => {
  it('根据属性名推断图片类型', () => {
    expect(inferFieldType('imageUrl', '')).toBe('image')
    expect(inferFieldType('userImg', '')).toBe('image')
    expect(inferFieldType('picture', '')).toBe('image')
    expect(inferFieldType('photo', '')).toBe('image')
  })

  it('根据属性名推断视频类型', () => {
    expect(inferFieldType('videoUrl', '')).toBe('video')
    expect(inferFieldType('movie', '')).toBe('video')
    expect(inferFieldType('film', '')).toBe('video')
  })

  it('根据属性名推断音频类型', () => {
    expect(inferFieldType('audioUrl', '')).toBe('audio')
    expect(inferFieldType('sound', '')).toBe('audio')
    expect(inferFieldType('music', '')).toBe('audio')
  })

  it('根据属性名推断日期时间', () => {
    expect(inferFieldType('startDate', '')).toBe('date')
    expect(inferFieldType('endTime', '')).toBe('datetime-local')
  })

  it('根据属性名推断数字', () => {
    expect(inferFieldType('page', '')).toBe('number')
    expect(inferFieldType('pageSize', '')).toBe('number')
    expect(inferFieldType('count', '')).toBe('number')
    expect(inferFieldType('limit', '')).toBe('number')
  })

  it('根据属性名推断布尔', () => {
    expect(inferFieldType('enabled', '')).toBe('boolean')
    expect(inferFieldType('isActive', '')).toBe('boolean')
    expect(inferFieldType('hasHeader', '')).toBe('boolean')
    expect(inferFieldType('shouldRetry', '')).toBe('boolean')
  })

  it('根据属性名推断文本域', () => {
    expect(inferFieldType('description', '')).toBe('textarea')
    expect(inferFieldType('content', '')).toBe('textarea')
    expect(inferFieldType('plainText', '')).toBe('textarea')
  })

  it('根据属性名推断富文本', () => {
    expect(inferFieldType('markdown', '')).toBe('richtext')
  })

  it('richText 因 text 检查优先返回 textarea（保持现有行为）', () => {
    // 原实现中 textarea 检查（含 'text'）先于 richtext 检查，因此 richText 命中 textarea
    expect(inferFieldType('richText', '')).toBe('textarea')
  })

  it('根据值类型推断', () => {
    expect(inferFieldType('value', 42)).toBe('number')
    expect(inferFieldType('value', true)).toBe('boolean')
    expect(inferFieldType('value', new Date())).toBe('date')
    expect(inferFieldType('value', 'short')).toBe('string')
    expect(inferFieldType('value', 'x'.repeat(101))).toBe('textarea')
    expect(inferFieldType('value', { a: 1 })).toBe('any')
  })

  it('字符串 URL 推断媒体类型', () => {
    expect(inferFieldType('value', 'https://x.com/a.jpg')).toBe('image')
    expect(inferFieldType('value', 'data:image/png;base64,xxx')).toBe('image')
    expect(inferFieldType('value', 'https://x.com/a.mp4')).toBe('video')
    expect(inferFieldType('value', 'data:video/mp4;base64,xxx')).toBe('video')
    expect(inferFieldType('value', 'https://x.com/a.mp3')).toBe('audio')
    expect(inferFieldType('value', 'data:audio/mp3;base64,xxx')).toBe('audio')
  })

  it('默认回退文本类型', () => {
    expect(inferFieldType('xyz', '')).toBe('string')
  })
})

describe('formatLabel', () => {
  it('使用常见词汇映射', () => {
    expect(formatLabel('keyword')).toBe('关键词')
    expect(formatLabel('query')).toBe('查询条件')
    expect(formatLabel('pageSize')).toBe('每页数量')
    expect(formatLabel('mblogid')).toBe('微博 ID')
    expect(formatLabel('uploadedImage')).toBe('已上传图片')
    expect(formatLabel('videoUrl')).toBe('视频地址')
  })

  it('驼峰转空格分隔并首字母大写', () => {
    expect(formatLabel('someField')).toBe('Some Field')
    expect(formatLabel('a')).toBe('A')
    expect(formatLabel('customProp')).toBe('Custom Prop')
  })
})

describe('getPlaceholder', () => {
  it('关键词/查询占位', () => {
    expect(getPlaceholder('keyword', 'string')).toBe('请输入搜索关键词')
    expect(getPlaceholder('queryText', 'string')).toBe('请输入搜索关键词')
  })

  it('URL 占位', () => {
    expect(getPlaceholder('url', 'string')).toBe('https://example.com')
  })

  it('页码占位优先于数字类型', () => {
    expect(getPlaceholder('page', 'number')).toBe('1')
  })

  it('按字段类型占位', () => {
    expect(getPlaceholder('age', 'number')).toBe('0')
    expect(getPlaceholder('note', 'textarea')).toBe('请输入多行文本...')
    expect(getPlaceholder('pic', 'image')).toBe('点击上传图片')
    expect(getPlaceholder('vid', 'video')).toBe('点击上传视频')
    expect(getPlaceholder('aud', 'audio')).toBe('点击上传音频')
  })

  it('默认占位使用格式化标签', () => {
    expect(getPlaceholder('name', 'string')).toBe('请输入Name')
  })
})

describe('groupFieldsByNode', () => {
  it('按节点分组字段并保留顺序', () => {
    const fields: any[] = [
      { nodeId: 'n1', nodeName: '节点A', propertyKey: 'a', fullKey: 'n1.a' },
      { nodeId: 'n1', nodeName: '节点A', propertyKey: 'b', fullKey: 'n1.b' },
      { nodeId: 'n2', nodeName: '节点B', propertyKey: 'c', fullKey: 'n2.c' },
    ]
    const result = groupFieldsByNode(fields)

    expect(result).toHaveLength(2)
    expect(result[0].nodeId).toBe('n1')
    expect(result[0].nodeName).toBe('节点A')
    expect(result[0].fields.map((f) => f.propertyKey)).toEqual(['a', 'b'])
    expect(result[1].nodeId).toBe('n2')
    expect(result[1].fields).toHaveLength(1)
  })

  it('空数组返回空数组', () => {
    expect(groupFieldsByNode([])).toEqual([])
  })
})
