import { root } from '@sker/core'
import { NODE } from '@sker/workflow'
import { BaseNode } from './BaseNode'
import { GroupNode } from './GroupNode'

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