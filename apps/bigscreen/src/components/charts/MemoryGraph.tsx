import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, {
  Node,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { PersonaMemoryGraph, MemoryNode as MemoryNodeType, MemoryType } from '@sker/sdk';
import { buildMemoryGraphLayout, MEMORY_MINIMAP_COLORS } from './memory-graph-layout';

const MEMORY_TYPE_COLORS: Record<MemoryType, { bg: string; border: string; text: string }> = {
  fact: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },
  concept: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700' },
  event: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700' },
  person: { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-700' },
  insight: { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-700' },
};

const PersonaNode = ({ data }: { data: { persona: PersonaMemoryGraph['persona'] } }) => {
  const { persona } = data;
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="relative"
    >
      <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3" />
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg border-4 border-white">
        {persona.avatar ? (
          <img src={persona.avatar} alt={persona.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="text-2xl font-bold text-white">{persona.name[0]}</span>
        )}
      </div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-medium text-foreground bg-background/90 px-2 py-0.5 rounded shadow">
        {persona.name}
      </div>
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/30"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
};

const MemoryNodeComponent = ({ data }: { data: { memory: MemoryNodeType } }) => {
  const { memory } = data;
  const isHub = Boolean(memory.isSectionHub);
  const colors = isHub
    ? { bg: 'bg-slate-200', border: 'border-slate-500', text: 'text-slate-900' }
    : MEMORY_TYPE_COLORS[memory.type];
  const metaLabel = isHub
    ? 'section hub'
    : [memory.treeKind, memory.badge, memory.timeRange?.startAt ? '含时间轴' : null]
        .filter(Boolean)
        .join(' · ') || [memory.section, memory.stability, memory.type].filter(Boolean).join(' · ');

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="group relative"
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-2 !h-2" />

      <div className={`px-3 py-2 rounded-lg border-2 ${colors.bg} ${colors.border} shadow-md ${isHub ? 'min-w-[132px]' : 'min-w-[100px]'} max-w-[180px]`}>
        <div className={`text-xs font-medium ${colors.text} truncate`}>{memory.name}</div>
        <div className="text-[10px] text-gray-500 mt-0.5 capitalize">{metaLabel}</div>
      </div>

      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
        <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl max-w-[240px]">
          <div className="font-medium mb-1">{memory.name}</div>
          {memory.description && <div className="text-gray-300 text-[10px] mb-1">{memory.description}</div>}
          <div className="text-gray-400 text-[10px] line-clamp-3">{memory.content}</div>
        </div>
      </div>
    </motion.div>
  );
};

// 将 nodeTypes 定义在组件外部以避免每次渲染时重新创建
const nodeTypes = {
  persona: PersonaNode,
  memory: MemoryNodeComponent,
};

interface MemoryGraphProps {
  data: PersonaMemoryGraph;
  className?: string;
}

export const MemoryGraph: React.FC<MemoryGraphProps> = ({ data, className = '' }) => {
  const { initialNodes, initialEdges } = useMemo(() => {
    const layout = buildMemoryGraphLayout(data);
    return {
      initialNodes: layout.nodes,
      initialEdges: layout.edges,
    };
  }, [data]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const nodeColor = useCallback((node: Node) => {
    if (node.type === 'persona') return '#6366f1';
    const memory = node.data?.memory as MemoryNodeType;
    if (memory?.isSectionHub) return '#475569';
    return MEMORY_MINIMAP_COLORS[memory?.type as MemoryType] || '#94a3b8';
  }, []);

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <MiniMap nodeColor={nodeColor} className="bg-white/80 rounded-lg shadow" />
      </ReactFlow>
    </div>
  );
};

export default MemoryGraph;
