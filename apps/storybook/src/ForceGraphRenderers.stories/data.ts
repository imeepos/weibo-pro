/**
 * ForceGraphRenderers stories 的 mock 数据与共享常量
 * 与业务无关，仅用于展示各渲染器的效果。
 */

export const nodeShapes = ['sphere', 'cube', 'cylinder', 'dodecahedron'] as const;
export const nodeColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];
export const linkColors: Record<string, string> = {
  strong: '#ef4444',
  medium: '#f59e0b',
  weak: '#6b7280',
};

export const generateSampleData = () => {
  const nodes = [
    { id: '1', name: '中心', val: 10, importance: 100, lastActive: new Date().toISOString() },
    { id: '2', name: '节点A', val: 5, importance: 80, lastActive: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', name: '节点B', val: 7, importance: 90, lastActive: new Date(Date.now() - 604800000).toISOString() },
    { id: '4', name: '节点C', val: 4, importance: 60, lastActive: new Date(Date.now() - 2592000000).toISOString() },
    { id: '5', name: '节点D', val: 6, importance: 75, lastActive: new Date().toISOString() },
    { id: '6', name: '节点E', val: 3, importance: 50, lastActive: new Date(Date.now() - 86400000 * 7).toISOString() },
  ];

  const links = [
    { source: '1', target: '2', value: 10, type: 'strong' },
    { source: '1', target: '3', value: 15, type: 'strong' },
    { source: '1', target: '4', value: 8, type: 'weak' },
    { source: '2', target: '5', value: 12, type: 'medium' },
    { source: '3', target: '6', value: 6, type: 'weak' },
    { source: '4', target: '6', value: 9, type: 'medium' },
  ];

  return { nodes, links };
};

/** 计算距最近活跃的天数 */
export const daysSinceActive = (lastActive: string): number =>
  Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24));

/** 按活跃天数计算节点透明度 */
export const opacityByDays = (days: number): number => {
  if (days <= 1) return 1.0;
  if (days <= 7) return 0.8;
  if (days <= 30) return 0.6;
  return 0.3;
};

/** 按重要度计算节点颜色 */
export const importanceColor = (importance: number): string => {
  if (importance >= 90) return '#ef4444';
  if (importance >= 75) return '#f59e0b';
  if (importance >= 60) return '#3b82f6';
  return '#6b7280';
};
