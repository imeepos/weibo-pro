/**
 * 派生节点 API 服务
 */

interface DerivedNodePayload {
  baseNodeType: string
  frozenInputs: Record<string, unknown>
  exposedInputs: string[]
  customOutputs: any[]
  metadata: {
    name: string
    title: string
    type: string
    description: string
  }
}

export async function saveDerivedNode(payload: DerivedNodePayload): Promise<void> {
  // TODO: 实现 API 调用
  console.log('保存派生节点:', payload)
}

export async function loadDerivedNodes(): Promise<DerivedNodePayload[]> {
  // TODO: 实现 API 调用
  return []
}

export async function deleteDerivedNode(id: string): Promise<void> {
  // TODO: 实现 API 调用
  console.log('删除派生节点:', id)
}
