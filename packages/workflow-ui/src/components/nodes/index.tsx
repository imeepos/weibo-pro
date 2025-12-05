import { root } from '@sker/core'
import { RENDER_METHOD } from '@sker/workflow'
import { BaseNode } from './BaseNode'
import { GroupNode } from './GroupNode'

export const createNodeTypes = () => {
  const methods = root.get(RENDER_METHOD, [])
  const obj: Record<string, typeof BaseNode | typeof GroupNode> = {
    GroupNode: GroupNode
  }
  methods.map(({ ast }) => {
    Reflect.set(obj, ast.name, BaseNode)
  })
  return obj
}