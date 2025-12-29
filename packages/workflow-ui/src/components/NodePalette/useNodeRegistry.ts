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
    const seen = new Set<string>()

    return nodeTypes
      .map(NodeClass => {
        const tempAst = new NodeClass()
        const compiledNode = compiler.compile(tempAst)
        const metadata = getNodeMetadata(compiledNode)

        // Diagnostic: Check for undefined input properties
        const undefinedInputs = metadata.inputs.filter(input => !input.property)
        if (undefinedInputs.length > 0) {
          console.log(`[NodeRegistry] Node "${metadata.type}" has ${undefinedInputs.length} input(s) with undefined property:`, undefinedInputs)
        }

        return metadata
      })
      .filter(metadata => {
        if (seen.has(metadata.type)) return false
        seen.add(metadata.type)
        return true
      })
  }, [])
}
