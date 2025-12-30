import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';

interface GraphNode {
  id: string;
}

interface GraphEdge {
  source: string | { id: string };
  target: string | { id: string };
  weight?: number;
}

export interface Community {
  id: number;
  nodes: string[];
  color: string;
  size: number;
}

// 生成更多颜色的函数
const generateCommunityColors = (count: number): string[] => {
  const colors: string[] = [];
  const goldenRatio = 0.618033988749895;
  let hue = Math.random();

  for (let i = 0; i < count; i++) {
    hue = (hue + goldenRatio) % 1;
    const saturation = 0.6 + Math.random() * 0.2;
    const lightness = 0.5 + Math.random() * 0.2;
    colors.push(hslToHex(hue * 360, saturation * 100, lightness * 100));
  }

  return colors;
};

const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const normalizeId = (id: string | { id: string }): string =>
  typeof id === 'object' ? id.id : id;

export class GraphologyCommunityDetector<N extends GraphNode, E extends GraphEdge> {
  private nodes: N[];
  private edges: E[];

  constructor(nodes: N[], edges: E[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  detectCommunities(options?: { resolution?: number }): Community[] {
    const graph = new Graph({ type: 'undirected' });

    // 添加节点
    this.nodes.forEach(node => {
      graph.addNode(node.id);
    });

    // 添加边
    this.edges.forEach(edge => {
      const source = normalizeId(edge.source);
      const target = normalizeId(edge.target);
      const weight = edge.weight || 1;

      if (graph.hasNode(source) && graph.hasNode(target) && !graph.hasEdge(source, target)) {
        graph.addEdge(source, target, { weight });
      }
    });

    // 运行 Louvain 算法
    const communities = louvain(graph, {
      resolution: options?.resolution || 1,
      randomWalk: false,
    });

    console.log('🔍 Louvain 社群检测结果:', communities);

    // 构建社群对象
    const communityMap = new Map<number, Set<string>>();
    for (const [nodeId, communityId] of Object.entries(communities)) {
      if (!communityMap.has(communityId)) {
        communityMap.set(communityId, new Set());
      }
      communityMap.get(communityId)!.add(nodeId);
    }

    const result: Community[] = Array.from(communityMap.entries())
      .map(([id, nodes], index) => ({
        id,
        nodes: Array.from(nodes),
        color: '',
        size: nodes.size,
      }))
      .sort((a, b) => b.size - a.size);

    // 生成足够的颜色
    const colors = generateCommunityColors(result.length);
    result.forEach((community, index) => {
      community.color = colors[index];
    });

    console.log(`✅ 检测到 ${result.length} 个社群:`, result.map(c => ({ id: c.id, size: c.size })));

    return result;
  }
}
