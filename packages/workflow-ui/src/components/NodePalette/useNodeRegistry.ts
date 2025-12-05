import { useMemo } from 'react'
import { getAllNodeTypes, getNodeMetadata } from '../../adapters'
import { Compiler } from '@sker/workflow'
import { root } from '@sker/core'
import type { NodeMetadata } from '../../types'

/**
 * 节点注册表 Hook
 */
export function useNodeRegistry(): NodeMetadata[] {
  return useMemo(() => {
    const nodeTypes = getAllNodeTypes()
    const compiler = root.get(Compiler)

    return nodeTypes.map(NodeClass => {
      // Create a temporary instance and compile it to get metadata
      const tempAst = new NodeClass()
      const compiledNode = compiler.compile(tempAst)
      return getNodeMetadata(compiledNode)
    })
  }, [])
}
