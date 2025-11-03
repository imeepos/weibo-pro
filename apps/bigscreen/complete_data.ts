import { BleMeshTopologyData } from './src/types/bleMesh';

export const networkData: BleMeshTopologyData[] = [
  // Echo Hub 连接
  { Source: 'echo1', target: 'node1', count: 25, x: 100, y: 100, size: 30 },
  { Source: 'echo1', target: 'node2', count: 18, x: 150, y: 120, size: 25 },
  { Source: 'echo2', target: 'node2', count: 22, x: 200, y: 100, size: 28 },
  { Source: 'echo2', target: 'node3', count: 15, x: 250, y: 120, size: 22 },
  { Source: 'echo3', target: 'node1', count: 12, x: 300, y: 100, size: 20 },
  { Source: 'echo3', target: 'node5', count: 8, x: 350, y: 140, size: 18 },

  // Node 之间的连接
  { Source: 'node1', target: 'node4', count: 30, x: 150, y: 200, size: 32 },
  { Source: 'node2', target: 'node4', count: 20, x: 200, y: 200, size: 26 },
  { Source: 'node3', target: 'node4', count: 16, x: 250, y: 220, size: 23 },

  // 更多网络连接
  { Source: 'echo1', target: 'node3', count: 10, x: 100, y: 140, size: 19 },
  { Source: 'echo2', target: 'node1', count: 14, x: 200, y: 80, size: 21 },
  { Source: 'node4', target: 'node5', count: 12, x: 300, y: 220, size: 20 },
];
