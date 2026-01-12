import { root } from '@sker/core'
import { NODE } from '@sker/workflow'
import { BaseNode } from './BaseNode'
import { GroupNode } from './GroupNode'

// 导出 NodeInfoDialog 供外部使用
export { NodeInfoDialog } from './NodeInfoDialog'

export const createNodeTypes = () => {
  const methods = root.get(NODE, [])
  const obj: Record<string, typeof BaseNode | typeof GroupNode> = {
    GroupNode: GroupNode
  }
  methods.map(({ target }) => {
    Reflect.set(obj, target.name, BaseNode)
  })
  return obj
}