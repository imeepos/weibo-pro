import { describe, expect, it } from 'vitest'
import {
  buildDerivedNodeCreatePayload,
  getDerivedNodeSaveValidationError,
  type DerivedNodeWorkbenchSaveDraft,
} from './save-payload'

const draft: DerivedNodeWorkbenchSaveDraft = {
  baseNode: {
    type: 'meta-node',
    metadata: {
      outputs: [
        { property: 'origin', title: '原始输出', type: 'string' },
      ],
    },
  } as any,
  frozenInputs: {
    fixedAuthor: '玄纬',
  },
  exposedInputs: [
    {
      property: 'keyword',
      title: '关键词',
      type: 'string',
      defaultValue: 'AI',
    },
  ],
  customOutputs: [
    {
      property: 'score',
      title: '评分',
      type: 'number',
    },
  ],
  nodeMetadata: {
    name: ' derived_meta ',
    title: ' 派生节点 ',
    type: ' derived_meta ',
    description: '  用于测试保存映射  ',
  },
}

describe('save-payload', () => {
  it('maps the workbench draft into CreateDerivedNodePayload', () => {
    expect(buildDerivedNodeCreatePayload(draft)).toEqual({
      name: 'derived_meta',
      baseType: 'meta-node',
      frozenInputs: {
        fixedAuthor: '玄纬',
      },
      nodeMetadata: {
        class: {
          title: '派生节点',
          type: 'derived_meta',
          description: '用于测试保存映射',
        },
        inputs: [
          {
            property: 'keyword',
            title: '关键词',
            type: 'string',
            defaultValue: 'AI',
          },
        ],
        outputs: [
          {
            property: 'origin',
            title: '原始输出',
            type: 'string',
          },
          {
            property: 'score',
            title: '评分',
            type: 'number',
          },
        ],
      },
    })
  })

  it('normalizes an empty description to undefined', () => {
    const result = buildDerivedNodeCreatePayload({
      ...draft,
      nodeMetadata: {
        ...draft.nodeMetadata,
        description: '   ',
      },
    })

    expect(result?.nodeMetadata.class.description).toBeUndefined()
  })

  it('returns a validation error when no base node is selected', () => {
    expect(
      getDerivedNodeSaveValidationError({
        ...draft,
        baseNode: null,
      })
    ).toBe('请先选择元节点')
  })

  it('returns a validation error when required metadata is blank', () => {
    expect(
      getDerivedNodeSaveValidationError({
        ...draft,
        nodeMetadata: {
          ...draft.nodeMetadata,
          title: '   ',
        },
      })
    ).toBe('请补全节点名称、标题和类型')
  })
})
