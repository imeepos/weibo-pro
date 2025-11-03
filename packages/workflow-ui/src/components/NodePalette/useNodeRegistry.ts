import { useMemo } from 'react'
import { getAllNodeTypes, getNodeMetadata } from '../../adapters'
import type { NodeMetadata } from '../../types'

/**
 * 节点注册表 Hook
 */
export function useNodeRegistry(): NodeMetadata[] {
  return useMemo(() => {
    const nodeTypes = getAllNodeTypes()
    return nodeTypes.map(getNodeMetadata)
  }, [])
}
