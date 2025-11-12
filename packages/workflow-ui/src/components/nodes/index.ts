import { BaseNode } from './BaseNode'
import { WorkflowGraphAstRender } from './WorkflowGraphAstRender'

export { BaseNode } from './BaseNode'

export const createNodeTypes = ()=>{

  return {
    'workflow-node': BaseNode,
    'WorkflowGraphAst': WorkflowGraphAstRender
  }
}