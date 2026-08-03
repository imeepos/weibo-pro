/**
 * ForceGraph3D stories 的 mock 数据与共享常量
 * 与业务无关，仅用于展示图表的渲染效果。
 */

export const nodeColors: Record<string, string> = {
  official: '#ef4444',
  media: '#3b82f6',
  kol: '#a855f7',
  normal: '#10b981',
};

export const shapeMap: Record<string, 'sphere' | 'cube' | 'cylinder' | 'dodecahedron'> = {
  official: 'cube',
  media: 'cylinder',
  kol: 'dodecahedron',
  normal: 'sphere',
};

export const generateSampleData = (nodeCount: number = 6) => {
  const nodes = [
    { id: '1', name: '中心节点', val: 10, type: 'official' },
    { id: '2', name: '节点A', val: 5, type: 'media' },
    { id: '3', name: '节点B', val: 7, type: 'kol' },
    { id: '4', name: '节点C', val: 4, type: 'normal' },
    { id: '5', name: '节点D', val: 6, type: 'media' },
    { id: '6', name: '节点E', val: 3, type: 'normal' },
  ];

  const links = [
    { source: '1', target: '2', value: 10 },
    { source: '1', target: '3', value: 15 },
    { source: '1', target: '4', value: 8 },
    { source: '2', target: '5', value: 12 },
    { source: '3', target: '6', value: 6 },
    { source: '4', target: '6', value: 9 },
  ];

  return {
    nodes: nodes.slice(0, nodeCount),
    links: links.filter(l => {
      const sourceIndex = parseInt(l.source) - 1;
      const targetIndex = parseInt(l.target) - 1;
      return sourceIndex < nodeCount && targetIndex < nodeCount;
    })
  };
};

export const generateLargeData = () => {
  const nodes = Array.from({ length: 50 }, (_, i) => ({
    id: `${i + 1}`,
    name: `节点${i + 1}`,
    val: Math.random() * 10 + 3,
    type: ['official', 'media', 'kol', 'normal'][Math.floor(Math.random() * 4)],
  }));

  const links = [];
  for (let i = 0; i < 80; i++) {
    const source = Math.floor(Math.random() * 50) + 1;
    const target = Math.floor(Math.random() * 50) + 1;
    if (source !== target) {
      links.push({
        source: `${source}`,
        target: `${target}`,
        value: Math.random() * 20 + 5,
      });
    }
  }

  return { nodes, links };
};
