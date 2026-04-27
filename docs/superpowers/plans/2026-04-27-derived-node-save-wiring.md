# DerivedNodeWorkbench 保存接线实现计划

> **给 agent 执行者：** 必选子技能：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐项实现本计划。步骤统一使用 checkbox（`- [ ]`）语法跟踪。

**目标：** 把 `DerivedNodeWorkbench` 的“保存”按钮接成真实可用的保存动作，确保 payload 与 `CreateDerivedNodePayload` 对齐，并给出最小成功/失败反馈。

**方案概览：** 保存边界新增一个独立的 payload helper，用它统一处理最小校验、字符串归一化和“基础输出 + 自定义输出”的合并语义。组件层只负责按钮状态、调用 `saveDerivedNode` 和 toast 反馈；`MetadataStep` 同步改成展示真实保存 payload，避免调试面板与实际请求体不一致。

**技术栈：** React 19、Vitest、Testing Library、Zustand、`sonner`、`@sker/sdk`

---

## 文件结构

- 新建：`packages/workflow-ui/src/components/DerivedNodeWorkbench/save-payload.ts`
  责任：封装保存所需的 draft 校验与 `CreateDerivedNodePayload` 映射逻辑
- 新建：`packages/workflow-ui/src/components/DerivedNodeWorkbench/save-payload.test.ts`
  责任：锁定 trim、description 归一化、输出合并和最小校验语义
- 新建：`packages/workflow-ui/src/components/DerivedNodeWorkbench/steps/MetadataStep.test.tsx`
  责任：验证“保存数据”区域展示的已是最终 payload，而不是旧的草稿结构
- 新建：`packages/workflow-ui/src/components/DerivedNodeWorkbench/index.test.tsx`
  责任：验证保存按钮接线、保存中禁用、成功/失败 toast 和前置校验
- 修改：`packages/workflow-ui/src/components/DerivedNodeWorkbench/index.tsx`
  责任：接通 `saveDerivedNode`、管理 `isSaving`、显示 `Toaster`
- 修改：`packages/workflow-ui/src/components/DerivedNodeWorkbench/steps/MetadataStep.tsx`
  责任：改为复用 payload helper，展示真实保存请求体

## 任务 1：新增保存 payload helper

**文件：**
- 新建：`packages/workflow-ui/src/components/DerivedNodeWorkbench/save-payload.ts`
- 新建：`packages/workflow-ui/src/components/DerivedNodeWorkbench/save-payload.test.ts`

- [ ] **步骤 1：先写失败测试**

```ts
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
```

- [ ] **步骤 2：运行测试，确认它先失败**

运行：`pnpm --filter @sker/workflow-ui exec vitest run src/components/DerivedNodeWorkbench/save-payload.test.ts`

预期：FAIL，提示缺少 `save-payload.ts` 或缺少 `buildDerivedNodeCreatePayload / getDerivedNodeSaveValidationError` 导出。

- [ ] **步骤 3：编写最小实现**

```ts
import type { CreateDerivedNodePayload } from '@sker/sdk'
import type { INode, INodeInputMetadata, INodeOutputMetadata } from '@sker/workflow'

export interface DerivedNodeWorkbenchSaveDraft {
  baseNode: Pick<INode, 'type' | 'metadata'> | null
  frozenInputs: Record<string, unknown>
  exposedInputs: INodeInputMetadata[]
  customOutputs: INodeOutputMetadata[]
  nodeMetadata: {
    name: string
    title: string
    type: string
    description: string
  }
}

const normalizeText = (value: string) => value.trim()

export function getDerivedNodeSaveValidationError(
  draft: DerivedNodeWorkbenchSaveDraft
): string | null {
  if (!draft.baseNode) {
    return '请先选择元节点'
  }

  const { name, title, type } = draft.nodeMetadata
  if (!normalizeText(name) || !normalizeText(title) || !normalizeText(type)) {
    return '请补全节点名称、标题和类型'
  }

  return null
}

export function buildDerivedNodeCreatePayload(
  draft: DerivedNodeWorkbenchSaveDraft
): CreateDerivedNodePayload | null {
  if (!draft.baseNode) {
    return null
  }

  const name = normalizeText(draft.nodeMetadata.name)
  const title = normalizeText(draft.nodeMetadata.title)
  const type = normalizeText(draft.nodeMetadata.type)
  const description = normalizeText(draft.nodeMetadata.description)

  return {
    name,
    baseType: draft.baseNode.type,
    frozenInputs: draft.frozenInputs,
    nodeMetadata: {
      class: {
        title,
        type,
        description: description || undefined,
      },
      inputs: draft.exposedInputs.map((input) => ({
        property: input.property,
        title: input.title || input.property,
        type: input.type,
        defaultValue: input.defaultValue,
      })),
      outputs: [
        ...((draft.baseNode.metadata?.outputs || []).map((output) => ({
          property: output.property,
          title: output.title || output.property,
          type: output.type,
        }))),
        ...draft.customOutputs.map((output) => ({
          property: output.property,
          title: output.title || output.property,
          type: output.type,
        })),
      ],
    },
  }
}
```

- [ ] **步骤 4：再次运行测试，确认通过**

运行：`pnpm --filter @sker/workflow-ui exec vitest run src/components/DerivedNodeWorkbench/save-payload.test.ts`

预期：PASS

- [ ] **步骤 5：提交**

```bash
git add packages/workflow-ui/src/components/DerivedNodeWorkbench/save-payload.ts packages/workflow-ui/src/components/DerivedNodeWorkbench/save-payload.test.ts
git commit -m "feat: add derived node save payload mapper"
```

## 任务 2：让 MetadataStep 展示真实保存 payload

**文件：**
- 新建：`packages/workflow-ui/src/components/DerivedNodeWorkbench/steps/MetadataStep.test.tsx`
- 修改：`packages/workflow-ui/src/components/DerivedNodeWorkbench/steps/MetadataStep.tsx`

- [ ] **步骤 1：先写失败测试**

```tsx
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { useDerivedNodeWorkbench } from '../../../store/derived-node-workbench.store'
import { MetadataStep } from './MetadataStep'

const store = useDerivedNodeWorkbench as any
const initialState = store.getState()

describe('MetadataStep', () => {
  beforeEach(() => {
    store.setState({
      ...initialState,
      baseNode: {
        id: 'base-1',
        type: 'meta-node',
        state: 'idle',
        count: 0,
        emitCount: 0,
        metadata: {
          class: { title: '元节点', type: 'meta-node' },
          inputs: [],
          outputs: [
            { property: 'origin', title: '原始输出', type: 'string' },
          ],
        },
      },
      frozenInputs: { fixed: 'value' },
      exposedInputs: [],
      customOutputs: [
        { property: 'extra', title: '附加输出', type: 'number' },
      ],
      nodeMetadata: {
        name: ' derived_meta ',
        title: ' 派生节点 ',
        type: ' derived_meta ',
        description: '',
      },
    })
  })

  afterEach(() => {
    store.setState(initialState)
  })

  it('renders the mapped create payload instead of the raw draft payload', () => {
    const { container } = render(<MetadataStep />)
    const savePanel = container.querySelectorAll('pre')[1]

    expect(savePanel?.textContent).toContain('"baseType": "meta-node"')
    expect(savePanel?.textContent).toContain('"origin"')
    expect(savePanel?.textContent).toContain('"extra"')
    expect(savePanel?.textContent).not.toContain('"baseNodeType"')
  })
})
```

- [ ] **步骤 2：运行测试，确认它先失败**

运行：`pnpm --filter @sker/workflow-ui exec vitest run src/components/DerivedNodeWorkbench/steps/MetadataStep.test.tsx`

预期：FAIL，因为当前 `MetadataStep` 仍在展示旧的草稿结构，`savePanel` 中不会出现 `"baseType"`。

- [ ] **步骤 3：编写最小实现**

```tsx
import React from 'react'
import { useDerivedNodeWorkbench } from '../../../store/derived-node-workbench.store'
import { buildDerivedNodeCreatePayload } from '../save-payload'

export function MetadataStep() {
  const {
    baseNode,
    frozenInputs,
    exposedInputs,
    customOutputs,
    nodeMetadata,
    getPreviewMetadata,
  } = useDerivedNodeWorkbench()

  const preview = getPreviewMetadata()
  const payload = buildDerivedNodeCreatePayload({
    baseNode,
    frozenInputs,
    exposedInputs,
    customOutputs,
    nodeMetadata,
  })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">预览元数据</h3>
        <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-64">
          {JSON.stringify(preview, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">保存数据</h3>
        <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-64">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </div>
  )
}
```

- [ ] **步骤 4：再次运行测试，确认通过**

运行：`pnpm --filter @sker/workflow-ui exec vitest run src/components/DerivedNodeWorkbench/steps/MetadataStep.test.tsx`

预期：PASS

- [ ] **步骤 5：提交**

```bash
git add packages/workflow-ui/src/components/DerivedNodeWorkbench/steps/MetadataStep.tsx packages/workflow-ui/src/components/DerivedNodeWorkbench/steps/MetadataStep.test.tsx
git commit -m "test: align derived node metadata save preview"
```

## 任务 3：接通保存按钮、按钮状态和 toast 反馈

**文件：**
- 新建：`packages/workflow-ui/src/components/DerivedNodeWorkbench/index.test.tsx`
- 修改：`packages/workflow-ui/src/components/DerivedNodeWorkbench/index.tsx`

- [ ] **步骤 1：先写失败测试**

```tsx
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useDerivedNodeWorkbench } from '../../store/derived-node-workbench.store'

const saveDerivedNode = vi.fn()
const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('./MetaNodePicker', () => ({
  MetaNodePicker: () => <div>MetaNodePicker</div>,
}))

vi.mock('./ConfigEditor', () => ({
  ConfigEditor: () => <div>ConfigEditor</div>,
}))

vi.mock('./NodePreview', () => ({
  NodePreview: () => <div>NodePreview</div>,
}))

vi.mock('../../services/derived-node.api', () => ({
  saveDerivedNode: (...args: any[]) => saveDerivedNode(...args),
}))

vi.mock('sonner', () => ({
  Toaster: () => <div data-testid="derived-node-toaster" />,
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}))

import { DerivedNodeWorkbench } from './index'

const store = useDerivedNodeWorkbench as any
const initialState = store.getState()

const readyState = {
  ...initialState,
  baseNode: {
    id: 'base-1',
    type: 'meta-node',
    state: 'idle',
    count: 0,
    emitCount: 0,
    metadata: {
      class: { title: '元节点', type: 'meta-node' },
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
      ],
    },
  },
  frozenInputs: {
    fixed: 'value',
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
    name: 'derived_meta',
    title: '派生节点',
    type: 'derived_meta',
    description: '用于测试',
  },
}

describe('DerivedNodeWorkbench', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.setState(readyState)
  })

  afterEach(() => {
    store.setState(initialState)
  })

  it('calls saveDerivedNode with the mapped payload and shows success feedback', async () => {
    saveDerivedNode.mockResolvedValue({ id: 'derived-1' })

    render(<DerivedNodeWorkbench />)
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(saveDerivedNode).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'derived_meta',
          baseType: 'meta-node',
          nodeMetadata: expect.objectContaining({
            outputs: expect.arrayContaining([
              expect.objectContaining({ property: 'origin' }),
              expect.objectContaining({ property: 'score' }),
            ]),
          }),
        })
      )
    })

    expect(toastSuccess).toHaveBeenCalledWith('保存成功')
  })

  it('disables the save button while the request is pending', async () => {
    let resolveSave!: (value: unknown) => void
    saveDerivedNode.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve
      })
    )

    render(<DerivedNodeWorkbench />)
    const saveButton = screen.getByText('保存') as HTMLButtonElement

    fireEvent.click(saveButton)
    expect(saveButton.disabled).toBe(true)

    resolveSave({ id: 'derived-1' })

    await waitFor(() => {
      expect(saveButton.disabled).toBe(false)
    })
  })

  it('shows backend error details when save fails', async () => {
    saveDerivedNode.mockRejectedValue(new Error('节点名称已存在'))

    render(<DerivedNodeWorkbench />)
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('保存失败：节点名称已存在')
    })
  })

  it('blocks save when required metadata is blank', () => {
    store.setState({
      ...readyState,
      nodeMetadata: {
        ...readyState.nodeMetadata,
        title: '   ',
      },
    })

    render(<DerivedNodeWorkbench />)
    fireEvent.click(screen.getByText('保存'))

    expect(saveDerivedNode).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('请补全节点名称、标题和类型')
  })
})
```

- [ ] **步骤 2：运行测试，确认它先失败**

运行：`pnpm --filter @sker/workflow-ui exec vitest run src/components/DerivedNodeWorkbench/index.test.tsx`

预期：FAIL，当前按钮仍是 `console.log`，不会调用 `saveDerivedNode`，也没有 `toast` / `Toaster` / `disabled` 行为。

- [ ] **步骤 3：编写最小实现**

```tsx
import React, { useState } from 'react'
import { Toaster, toast } from 'sonner'
import { MetaNodePicker } from './MetaNodePicker'
import { ConfigEditor } from './ConfigEditor'
import { NodePreview } from './NodePreview'
import { useDerivedNodeWorkbench } from '../../store/derived-node-workbench.store'
import { Button } from '@sker/ui/components/ui/button'
import { saveDerivedNode } from '../../services/derived-node.api'
import {
  buildDerivedNodeCreatePayload,
  getDerivedNodeSaveValidationError,
} from './save-payload'

export function DerivedNodeWorkbench() {
  const {
    reset,
    baseNode,
    frozenInputs,
    exposedInputs,
    customOutputs,
    nodeMetadata,
  } = useDerivedNodeWorkbench()
  const [isSaving, setIsSaving] = useState(false)

  const saveDraft = {
    baseNode,
    frozenInputs,
    exposedInputs,
    customOutputs,
    nodeMetadata,
  }

  const handleSave = async () => {
    const validationError = getDerivedNodeSaveValidationError(saveDraft)
    if (validationError) {
      toast.error(validationError)
      return
    }

    const payload = buildDerivedNodeCreatePayload(saveDraft)
    if (!payload) {
      toast.error('请先选择元节点')
      return
    }

    setIsSaving(true)

    try {
      await saveDerivedNode(payload)
      toast.success('保存成功')
    } catch (error: any) {
      const detail = error?.message ? `保存失败：${error.message}` : '保存失败'
      toast.error(detail)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="flex h-screen">
        <div className="w-80 border-r">
          <MetaNodePicker />
        </div>

        <div className="flex-1 border-r">
          <ConfigEditor />
        </div>

        <div className="w-96 flex flex-col">
          <div className="border-b p-4">
            <h3 className="text-sm font-semibold mb-3">实时预览</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset}>
                重置
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NodePreview />
          </div>
        </div>
      </div>
      <Toaster />
    </>
  )
}
```

- [ ] **步骤 4：再次运行测试，确认通过**

运行：`pnpm --filter @sker/workflow-ui exec vitest run src/components/DerivedNodeWorkbench/index.test.tsx`

预期：PASS

- [ ] **步骤 5：提交**

```bash
git add packages/workflow-ui/src/components/DerivedNodeWorkbench/index.tsx packages/workflow-ui/src/components/DerivedNodeWorkbench/index.test.tsx
git commit -m "feat: wire derived node save action"
```

## 任务 4：定向回归与构建验证

**文件：**
- 无新增文件

- [ ] **步骤 1：运行 DerivedNodeWorkbench 定向测试**

运行：`pnpm --filter @sker/workflow-ui exec vitest run src/components/DerivedNodeWorkbench/save-payload.test.ts src/components/DerivedNodeWorkbench/steps/MetadataStep.test.tsx src/components/DerivedNodeWorkbench/index.test.tsx`

预期：PASS

- [ ] **步骤 2：运行 workflow-ui 包构建**

运行：`pnpm --filter @sker/workflow-ui run build`

预期：PASS

- [ ] **步骤 3：运行仓库总构建**

运行：`pnpm run build`

预期：PASS；如果出现与当前切片无关的既有环境噪音，记录清楚并确认是否为新增回归。
