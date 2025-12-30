/**
 * LOD (Level of Detail) 管理器类型定义
 */

import type * as THREE from 'three';

/**
 * LOD 级别配置
 */
export interface LODLevel {
  id: number;                     // 级别 ID (0-4)
  name: string;                   // 级别名称
  minDistance: number;            // 最小距离（相机到节点）
  maxDistance: number;            // 最大距离
  maxVisibleNodes: number;        // 最大可见节点数
  nodeGeometry: 'sphere-32' | 'sphere-16' | 'sphere-8' | 'point'; // 几何体类型
  edgeRendering: 'full' | 'simplified' | 'none'; // 边渲染模式
  labelRendering: 'full' | 'important' | 'none'; // 标签渲染模式
}

/**
 * 八叉树节点（3D 空间分割）
 */
export interface OctreeNode {
  // 边界盒
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };

  // 中心点
  center: { x: number; y: number; z: number };

  // 大小
  size: number;

  // 深度
  depth: number;

  // 包含的点索引
  pointIndices: number[];

  // 子节点（8 个）
  children: OctreeNode[] | null;

  // 是否为叶节点
  isLeaf: boolean;
}

/**
 * 八叉树配置
 */
export interface OctreeConfig {
  maxPointsPerNode: number;       // 每个节点最大点数（默认 100）
  maxDepth: number;               // 最大深度（默认 10）
}

/**
 * LOD 更新结果
 */
export interface LODUpdateResult {
  visibleNodeIndices: Set<number>;  // 可见节点索引
  lodAssignments: Map<number, number>; // 节点 -> LOD 级别映射
  culledCount: number;              // 被剔除的节点数
  totalVisible: number;             // 总可见节点数
  lodDistribution: Record<number, number>; // LOD 级别分布统计
}

/**
 * 视锥体剔除结果
 */
export interface FrustumCullingResult {
  visibleIndices: Set<number>;
  culledCount: number;
}

/**
 * LOD 管理器配置
 */
export interface LODManagerConfig {
  levels: LODLevel[];
  octreeConfig?: OctreeConfig;
  enableFrustumCulling?: boolean;  // 启用视锥体剔除（默认 true）
  enableOcclusion?: boolean;       // 启用遮挡剔除（默认 false，性能开销大）
}
