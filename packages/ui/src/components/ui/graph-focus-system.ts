interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface GraphNode {
  id: string;
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string | { id: string };
  target: string | { id: string };
}

interface GraphData<N extends GraphNode = GraphNode, L extends GraphLink = GraphLink> {
  nodes: N[];
  links: L[];
}

export interface FocusResult {
  highlightNodes: Set<string>;
  dimmedNodes: Set<string>;
  cameraPosition: Point3D;
  cameraTarget: Point3D;
}

const normalizeId = (id: string | { id: string }): string =>
  typeof id === 'object' ? id.id : id;

const extractFocusLevels = <N extends GraphNode, L extends GraphLink>(
  rootId: string,
  graph: GraphData<N, L>,
  maxLevels: number
): Record<number, Set<string>> => {
  const levels: Record<number, Set<string>> = { 1: new Set(), 2: new Set() };

  for (const link of graph.links) {
    const sourceId = normalizeId(link.source);
    const targetId = normalizeId(link.target);

    if (sourceId === rootId || targetId === rootId) {
      const neighborId = sourceId === rootId ? targetId : sourceId;
      levels[1].add(neighborId);

      if (maxLevels >= 2) {
        for (const link2 of graph.links) {
          const source2Id = normalizeId(link2.source);
          const target2Id = normalizeId(link2.target);

          if (
            (source2Id === neighborId || target2Id === neighborId) &&
            !levels[1].has(source2Id === neighborId ? target2Id : source2Id)
          ) {
            const level2Id = source2Id === neighborId ? target2Id : source2Id;
            levels[2].add(level2Id);
          }
        }
      }
    }
  }

  return levels;
};

const calculateBoundingBox = (nodes: GraphNode[]): { min: Point3D; max: Point3D; center: Point3D } => {
  if (nodes.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      center: { x: 0, y: 0, z: 0 }
    };
  }

  const positions = nodes.map(n => ({ x: n.x || 0, y: n.y || 0, z: n.z || 0 }));

  const min = {
    x: Math.min(...positions.map(p => p.x)),
    y: Math.min(...positions.map(p => p.y)),
    z: Math.min(...positions.map(p => p.z))
  };

  const max = {
    x: Math.max(...positions.map(p => p.x)),
    y: Math.max(...positions.map(p => p.y)),
    z: Math.max(...positions.map(p => p.z))
  };

  return {
    min,
    max,
    center: {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2
    }
  };
};

const calculateOptimalCamera = <N extends GraphNode>(
  focusNodes: N[],
  fallback: Point3D = { x: 300, y: 300, z: 300 }
): { cameraPosition: Point3D; cameraTarget: Point3D } => {
  if (focusNodes.length === 0) {
    return {
      cameraPosition: fallback,
      cameraTarget: { x: 0, y: 0, z: 0 }
    };
  }

  const { min, max, center } = calculateBoundingBox(focusNodes);

  const width = max.x - min.x;
  const height = max.y - min.y;
  const depth = max.z - min.z;
  const maxDimension = Math.max(width, height, depth, 100);

  const distance = maxDimension * 1.5;

  return {
    cameraPosition: {
      x: center.x + distance,
      y: center.y + distance * 0.5,
      z: center.z + distance
    },
    cameraTarget: center
  };
};

export const smartFocusAlgorithm = <N extends GraphNode, L extends GraphLink>(
  rootNode: N,
  graph: GraphData<N, L>,
  maxLevels: number = 2
): FocusResult => {
  const focusLevels = extractFocusLevels(rootNode.id, graph, maxLevels);

  const highlightNodes = new Set<string>([...focusLevels[1], ...focusLevels[2]]);

  const allNodeIds = new Set<string>(graph.nodes.map(n => n.id));
  const dimmedNodes = new Set<string>([...allNodeIds].filter(id => !highlightNodes.has(id)));

  const focusedNodes = graph.nodes.filter(n => highlightNodes.has(n.id));
  const { cameraPosition, cameraTarget } = calculateOptimalCamera(focusedNodes);

  return {
    highlightNodes,
    dimmedNodes,
    cameraPosition,
    cameraTarget
  };
};
