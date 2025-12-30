/**
 * LOD 级别定义
 * 根据相机距离自动切换细节层次
 */

import type { LODLevel } from './types';

/**
 * 预定义的 LOD 级别配置
 * 5 个级别：超高清 -> 高清 -> 中等 -> 低清 -> 点云
 */
export const DEFAULT_LOD_LEVELS: LODLevel[] = [
  {
    id: 0,
    name: 'ultra-detail',
    minDistance: 0,
    maxDistance: 200,
    maxVisibleNodes: 10000,
    nodeGeometry: 'sphere-32',      // 高多边形球体
    edgeRendering: 'full',          // 完整边渲染
    labelRendering: 'full',         // 显示所有标签
  },
  {
    id: 1,
    name: 'high-detail',
    minDistance: 200,
    maxDistance: 500,
    maxVisibleNodes: 50000,
    nodeGeometry: 'sphere-16',      // 中等多边形球体
    edgeRendering: 'simplified',    // 简化边（抽样）
    labelRendering: 'important',    // 只显示重要标签
  },
  {
    id: 2,
    name: 'medium-detail',
    minDistance: 500,
    maxDistance: 1000,
    maxVisibleNodes: 200000,
    nodeGeometry: 'sphere-8',       // 低多边形球体
    edgeRendering: 'none',          // 不渲染边
    labelRendering: 'none',         // 不显示标签
  },
  {
    id: 3,
    name: 'low-detail',
    minDistance: 1000,
    maxDistance: 2000,
    maxVisibleNodes: 500000,
    nodeGeometry: 'point',          // 点渲染（最快）
    edgeRendering: 'none',
    labelRendering: 'none',
  },
  {
    id: 4,
    name: 'distant',
    minDistance: 2000,
    maxDistance: Infinity,
    maxVisibleNodes: Infinity,
    nodeGeometry: 'point',
    edgeRendering: 'none',
    labelRendering: 'none',
  },
];

/**
 * 根据距离获取 LOD 级别
 */
export function getLODLevel(distance: number, levels: LODLevel[] = DEFAULT_LOD_LEVELS): LODLevel {
  for (const level of levels) {
    if (distance >= level.minDistance && distance < level.maxDistance) {
      return level;
    }
  }
  // 默认返回最后一个级别
  return levels[levels.length - 1];
}

/**
 * 计算两点间的距离
 */
export function calculateDistance(
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
