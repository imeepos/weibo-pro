'use client'

import React, { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactFlow } from '@xyflow/react'
import { Search, Package } from 'lucide-react'
import { useWorkflowStore } from '../../store'
import { useNodeRegistry } from './useNodeRegistry'
import { NodeCard } from './NodeCard'
import { getAllNodeTypes } from '../../adapters'
import type { NodeMetadata, WorkflowNode } from '../../types'
import { generateId } from '@sker/workflow'
import { cn } from '../../utils/cn'

export interface NodePaletteProps {
  className?: string
}

export function NodePalette({ className = '' }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const nodeRegistry = useNodeRegistry()
  const addNode = useWorkflowStore((state) => state.addNode)
  const { screenToFlowPosition } = useReactFlow()

  const filteredNodes = nodeRegistry.filter((metadata) =>
    metadata.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    metadata.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddNode = useCallback(
    (metadata: NodeMetadata) => {
      const nodeTypes = getAllNodeTypes()
      const NodeClass = nodeTypes.find((type) => type.name === metadata.type)

      if (!NodeClass) return

      const ast = new NodeClass()
      ast.id = generateId()

      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })

      const node: WorkflowNode = {
        id: ast.id,
        type: metadata.type,
        position,
        data: ast,
      }

      addNode(node)
    },
    [addNode, screenToFlowPosition]
  )

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        'flex flex-col h-full bg-white border-r border-gray-200',
        'w-80 shadow-panel',
        className
      )}
    >
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">节点面板</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索节点..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-workflow-primary/20 focus:border-workflow-primary
                     transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredNodes.length === 0 ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <Package className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-600 font-medium">
              {searchQuery ? '未找到匹配的节点' : '暂无可用节点'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              使用 @Node() 装饰器注册节点
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredNodes.map((metadata) => (
                <NodeCard
                  key={metadata.type}
                  metadata={metadata}
                  onAddNode={handleAddNode}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}
