import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, {
  Node,
  Edge,
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
import type { PersonaMemoryGraph, MemoryNode as MemoryNodeType, MemoryType, RelationType } from '@sker/sdk';

const MEMORY_TYPE_COLORS: Record<MemoryType, { bg: string; border: string; text: string }> = {
  fact: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },
  concept: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700' },
  event: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700' },
  person: { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-700' },
  insight: { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-700' },
};

const RELATION_STYLES: Record<RelationType, { stroke: string; animated: boolean; label: string }> = {
  related: { stroke: '#94a3b8', animated: false, label: '关联' },
  causes: { stroke: '#f97316', animated: true, label: '导致' },
  follows: { stroke: '#3b82f6', animated: true, label: '跟随' },
  contains: { stroke: '#8b5cf6', animated: false, label: '包含' },
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
  const colors = MEMORY_TYPE_COLORS[memory.type];

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="group relative"
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-2 !h-2" />

      <div className={`px-3 py-2 rounded-lg border-2 ${colors.bg} ${colors.border} shadow-md min-w-[100px] max-w-[160px]`}>
        <div className={`text-xs font-medium ${colors.text} truncate`}>{memory.name}</div>
        <div className="text-[10px] text-gray-500 mt-0.5 capitalize">{memory.type}</div>
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
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    nodes.push({
      id: 'persona',
      type: 'persona',
      position: { x: 0, y: 0 },
      data: { persona: data.persona },
      draggable: false,
    });

    const memoryCount = data.memories.length;
    const radius = Math.max(200, memoryCount * 25);

    data.memories.forEach((memory, index) => {
      const angle = (index * 2 * Math.PI) / memoryCount - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      nodes.push({
        id: memory.id,
        type: 'memory',
        position: { x, y },
        data: { memory },
      });

      edges.push({
        id: `persona-${memory.id}`,
        source: 'persona',
        target: memory.id,
        type: 'smoothstep',
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      });
    });

    data.relations.forEach((relation) => {
      const style = RELATION_STYLES[relation.relationType];
      edges.push({
        id: relation.id,
        source: relation.sourceId,
        target: relation.targetId,
        type: 'smoothstep',
        animated: style.animated,
        style: { stroke: style.stroke, strokeWidth: 2 },
        label: style.label,
        labelStyle: { fontSize: 10, fill: style.stroke },
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [data]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const nodeColor = useCallback((node: Node) => {
    if (node.type === 'persona') return '#6366f1';
    const memory = node.data?.memory as MemoryNodeType;
    const colorMap: Record<MemoryType, string> = {
      fact: '#3b82f6',
      concept: '#8b5cf6',
      event: '#f59e0b',
      person: '#f43f5e',
      insight: '#10b981',
    };
    return colorMap[memory?.type] || '#94a3b8';
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
