import React, { useState } from 'react'
import { useDerivedNodeWorkbench } from '../../store/derived-node-workbench.store'
import { useNodeRegistry } from '../NodePalette/useNodeRegistry'
import { NodeCard } from '../NodePalette/NodeCard'
import { Search } from 'lucide-react'
import { getAllNodeTypes } from '../../adapters'
import { createCompiledNode } from '../../utils/createCompiledNode'

export function MetaNodePicker() {
  const [searchQuery, setSearchQuery] = useState('')
  const { selectBaseNode } = useDerivedNodeWorkbench()
  const nodeRegistry = useNodeRegistry()

  const filteredNodes = nodeRegistry.filter((metadata) =>
    metadata.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectNode = (nodeType: string) => {
    const nodeTypes = getAllNodeTypes()
    const NodeClass = nodeTypes.find((type) => type.name === nodeType)
    if (!NodeClass) return

    const compiledNode = createCompiledNode(NodeClass, { position: { x: 0, y: 0 } })
    selectBaseNode(compiledNode)
  }

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold mb-3">选择元节点</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索节点..."
            className="w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredNodes.map((metadata) => {
          return (
            <div key={metadata.type} onClick={() => handleSelectNode(metadata.type)}>
              <NodeCard metadata={metadata} onAddNode={() => handleSelectNode(metadata.type)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
