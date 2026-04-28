import type { PersonaMemoryGraph, MemoryType, RelationType } from '@sker/sdk';
import type { Edge, Node } from 'reactflow';

const PERSONA_NODE_ID = 'persona';
const HUB_X = 280;
const LEAF_X = 560;
const HUB_VERTICAL_GAP = 220;
const LEAF_VERTICAL_GAP = 92;

const RELATION_STYLES: Record<RelationType, { stroke: string; animated: boolean; label: string }> = {
  related: { stroke: '#94a3b8', animated: false, label: '关联' },
  causes: { stroke: '#f97316', animated: true, label: '导致' },
  follows: { stroke: '#3b82f6', animated: true, label: '跟随' },
  contains: { stroke: '#8b5cf6', animated: false, label: '包含' },
};

function buildRadialMemoryPositions(memories: PersonaMemoryGraph['memories']): Node[] {
  const memoryCount = memories.length;
  const radius = Math.max(200, memoryCount * 25);

  return memories.map((memory, index) => {
    const angle = (index * 2 * Math.PI) / memoryCount - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    return {
      id: memory.id,
      type: 'memory',
      position: { x, y },
      data: { memory },
    };
  });
}

function appendTreeNodes(
  parentId: string,
  nodes: Node[],
  edges: Edge[],
  items: NonNullable<PersonaMemoryGraph['tree']>,
  depth: number,
  offsetY: { current: number },
) {
  for (const item of items) {
    const nodeId = item.id;
    const y = offsetY.current;
    offsetY.current += 120;

    nodes.push({
      id: nodeId,
      type: 'memory',
      position: { x: depth * 260, y },
      data: {
        memory: {
          id: item.id,
          name: item.label,
          description: item.description,
          content: item.description ?? item.label,
          type: item.kind === 'behavior_signal' ? 'insight' : 'concept',
          createdAt: item.timeRange?.startAt ?? new Date().toISOString(),
          badge: item.badge,
          timeRange: item.timeRange,
          treeKind: item.kind,
        },
      },
      draggable: false,
    });

    edges.push({
      id: `${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'smoothstep',
      style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
    });

    if (item.children?.length) {
      appendTreeNodes(nodeId, nodes, edges, item.children, depth + 1, offsetY);
    }
  }
}

export function buildMemoryGraphLayout(data: PersonaMemoryGraph): { nodes: Node[]; edges: Edge[] } {
  if (data.tree?.length) {
    const nodes: Node[] = [
      {
        id: PERSONA_NODE_ID,
        type: 'persona',
        position: { x: 0, y: 0 },
        data: { persona: data.persona },
        draggable: false,
      },
    ];
    const edges: Edge[] = [];

    appendTreeNodes(PERSONA_NODE_ID, nodes, edges, data.tree, 1, { current: -40 });

    return { nodes, edges };
  }

  const hubMemories = data.memories.filter((memory) => memory.isSectionHub);
  const hubIds = new Set(hubMemories.map((memory) => memory.id));
  const hasHubs = hubIds.size > 0;

  const nodes: Node[] = [
    {
      id: PERSONA_NODE_ID,
      type: 'persona',
      position: { x: 0, y: 0 },
      data: { persona: data.persona },
      draggable: false,
    },
  ];

  const edges: Edge[] = [];

  if (!hasHubs) {
    const radialMemoryNodes = buildRadialMemoryPositions(data.memories);
    nodes.push(...radialMemoryNodes);

    for (const memory of data.memories) {
      edges.push({
        id: `persona-${memory.id}`,
        source: PERSONA_NODE_ID,
        target: memory.id,
        type: 'smoothstep',
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      });
    }
  } else {
    const containsSourceByTarget = new Map<string, string>();
    for (const relation of data.relations) {
      if (relation.relationType === 'contains' && hubIds.has(relation.sourceId)) {
        containsSourceByTarget.set(relation.targetId, relation.sourceId);
      }
    }

    const leavesByHubId = new Map<string, PersonaMemoryGraph['memories']>();
    const orphanLeaves: PersonaMemoryGraph['memories'] = [];

    for (const memory of data.memories) {
      if (memory.isSectionHub) {
        continue;
      }

      const hubId = containsSourceByTarget.get(memory.id);
      if (!hubId) {
        orphanLeaves.push(memory);
        continue;
      }

      const bucket = leavesByHubId.get(hubId) ?? [];
      bucket.push(memory);
      leavesByHubId.set(hubId, bucket);
    }

    hubMemories.forEach((memory, index) => {
      const y = (index - (hubMemories.length - 1) / 2) * HUB_VERTICAL_GAP;
      nodes.push({
        id: memory.id,
        type: 'memory',
        position: { x: HUB_X, y },
        data: { memory },
      });

      edges.push({
        id: `persona-${memory.id}`,
        source: PERSONA_NODE_ID,
        target: memory.id,
        type: 'smoothstep',
        style: { stroke: '#cbd5e1', strokeWidth: 2 },
      });

      const leaves = leavesByHubId.get(memory.id) ?? [];
      leaves.forEach((leaf, leafIndex) => {
        nodes.push({
          id: leaf.id,
          type: 'memory',
          position: {
            x: LEAF_X,
            y: y + (leafIndex - (leaves.length - 1) / 2) * LEAF_VERTICAL_GAP,
          },
          data: { memory: leaf },
        });
      });
    });

    orphanLeaves.forEach((memory, index) => {
      const y = (hubMemories.length * HUB_VERTICAL_GAP) / 2 + (index + 1) * LEAF_VERTICAL_GAP;
      nodes.push({
        id: memory.id,
        type: 'memory',
        position: { x: HUB_X, y },
        data: { memory },
      });

      edges.push({
        id: `persona-${memory.id}`,
        source: PERSONA_NODE_ID,
        target: memory.id,
        type: 'smoothstep',
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      });
    });
  }

  for (const relation of data.relations) {
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
  }

  return { nodes, edges };
}

export const MEMORY_MINIMAP_COLORS: Record<MemoryType, string> = {
  fact: '#3b82f6',
  concept: '#8b5cf6',
  event: '#f59e0b',
  person: '#f43f5e',
  insight: '#10b981',
};
