import { root } from '@sker/core'
import { RENDER_METHOD } from '@sker/workflow'
import { BaseNode } from './BaseNode';
export const createNodeTypes = () => {
  const methods = root.get(RENDER_METHOD, [])
  const obj = {}
  methods.map(({ ast }) => {
    if(ast.name === 'WorkflowGraphAst'){
      // 这里应该特殊处理
    }
    Reflect.set(obj, ast.name, BaseNode) // 使用 BaseNode 替代 NodeContainer
  })
  return obj;
}