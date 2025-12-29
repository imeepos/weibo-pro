import { useMemo } from 'react'
import { Compiler, NodeMetadata } from '@sker/workflow'
import { root } from '@sker/core'
import { getAllNodeTypes } from '@sker/workflow'

/**
 * 节点注册表 Hook
 */
export function useNodeRegistry(): NodeMetadata[] {
  return useMemo(() => {
    const nodeTypes = getAllNodeTypes()
    const compiler = root.get(Compiler)
    const seen = new Set<string>()

    return nodeTypes
      .map(NodeClass => {
        const tempAst = new NodeClass()
        const compiledNode = compiler.compile(tempAst)
        const metadata = compiledNode.metadata!
        return metadata
      })
      .filter(metadata => {
        if (seen.has(metadata.class.type!)) return false
        seen.add(metadata.class.type!)
        return true
      })
  }, [])
}
