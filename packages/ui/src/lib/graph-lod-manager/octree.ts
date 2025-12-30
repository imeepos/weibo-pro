/**
 * Octree（八叉树）空间索引
 * 用于快速的 3D 空间查询和视锥体剔除
 */

import type { OctreeNode, OctreeConfig } from './types';

const DEFAULT_CONFIG: OctreeConfig = {
  maxPointsPerNode: 100,
  maxDepth: 10,
};

/**
 * 点数据
 */
interface Point {
  index: number;
  x: number;
  y: number;
  z: number;
}

/**
 * 边界盒
 */
interface Bounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

/**
 * Octree 实现
 */
export class Octree {
  private root: OctreeNode | null = null;
  private config: OctreeConfig;

  constructor(config: Partial<OctreeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 构建八叉树
   */
  build(positions: Float32Array, nodeCount: number): void {
    console.log(`🌲 构建 Octree: ${nodeCount} 节点`);
    const startTime = performance.now();

    // 1. 转换为点数组
    const points: Point[] = [];
    for (let i = 0; i < nodeCount; i++) {
      points.push({
        index: i,
        x: positions[i * 3],
        y: positions[i * 3 + 1],
        z: positions[i * 3 + 2],
      });
    }

    // 2. 计算边界盒
    const bounds = this.calculateBounds(points);

    // 3. 递归构建树
    this.root = this.buildNode(points, bounds, 0);

    const elapsed = performance.now() - startTime;
    console.log(`✅ Octree 构建完成: 耗时 ${elapsed.toFixed(2)}ms`);
  }

  /**
   * 计算点集的边界盒
   */
  private calculateBounds(points: Point[]): Bounds {
    if (points.length === 0) {
      return {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
      };
    }

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      minZ = Math.min(minZ, point.z);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
      maxZ = Math.max(maxZ, point.z);
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    };
  }

  /**
   * 递归构建节点
   */
  private buildNode(points: Point[], bounds: Bounds, depth: number): OctreeNode {
    const center = {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2,
    };

    const size = Math.max(
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y,
      bounds.max.z - bounds.min.z
    );

    const node: OctreeNode = {
      bounds,
      center,
      size,
      depth,
      pointIndices: points.map((p) => p.index),
      children: null,
      isLeaf: true,
    };

    // 停止条件：达到最大深度或点数过少
    if (depth >= this.config.maxDepth || points.length <= this.config.maxPointsPerNode) {
      return node;
    }

    // 分割为 8 个子区域
    const childBounds = this.subdivide(bounds);
    const childPoints: Point[][] = Array.from({ length: 8 }, () => []);

    // 将点分配到子区域
    for (const point of points) {
      const octant = this.getOctant(point, center);
      childPoints[octant].push(point);
    }

    // 递归构建子节点（只为非空子区域构建）
    const children: OctreeNode[] = [];
    for (let i = 0; i < 8; i++) {
      if (childPoints[i].length > 0) {
        children.push(this.buildNode(childPoints[i], childBounds[i], depth + 1));
      }
    }

    if (children.length > 0) {
      node.children = children;
      node.isLeaf = false;
    }

    return node;
  }

  /**
   * 将边界盒分割为 8 个子区域
   */
  private subdivide(bounds: Bounds): Bounds[] {
    const { min, max } = bounds;
    const cx = (min.x + max.x) / 2;
    const cy = (min.y + max.y) / 2;
    const cz = (min.z + max.z) / 2;

    return [
      // 0: 左下前
      { min: { x: min.x, y: min.y, z: min.z }, max: { x: cx, y: cy, z: cz } },
      // 1: 右下前
      { min: { x: cx, y: min.y, z: min.z }, max: { x: max.x, y: cy, z: cz } },
      // 2: 左上前
      { min: { x: min.x, y: cy, z: min.z }, max: { x: cx, y: max.y, z: cz } },
      // 3: 右上前
      { min: { x: cx, y: cy, z: min.z }, max: { x: max.x, y: max.y, z: cz } },
      // 4: 左下后
      { min: { x: min.x, y: min.y, z: cz }, max: { x: cx, y: cy, z: max.z } },
      // 5: 右下后
      { min: { x: cx, y: min.y, z: cz }, max: { x: max.x, y: cy, z: max.z } },
      // 6: 左上后
      { min: { x: min.x, y: cy, z: cz }, max: { x: cx, y: max.y, z: max.z } },
      // 7: 右上后
      { min: { x: cx, y: cy, z: cz }, max: { x: max.x, y: max.y, z: max.z } },
    ];
  }

  /**
   * 获取点所属的八分区（0-7）
   */
  private getOctant(point: Point, center: { x: number; y: number; z: number }): number {
    let octant = 0;
    if (point.x >= center.x) octant |= 1; // 右
    if (point.y >= center.y) octant |= 2; // 上
    if (point.z >= center.z) octant |= 4; // 后
    return octant;
  }

  /**
   * 遍历树（深度优先）
   */
  traverse(callback: (node: OctreeNode) => boolean | void): void {
    if (!this.root) return;
    this.traverseNode(this.root, callback);
  }

  private traverseNode(node: OctreeNode, callback: (node: OctreeNode) => boolean | void): void {
    // 调用回调
    const shouldContinue = callback(node);

    // 如果回调返回 false，停止遍历该分支
    if (shouldContinue === false) return;

    // 递归遍历子节点
    if (node.children) {
      for (const child of node.children) {
        this.traverseNode(child, callback);
      }
    }
  }

  /**
   * 查询边界盒内的点
   */
  queryRange(bounds: Bounds): Set<number> {
    const result = new Set<number>();

    if (!this.root) return result;

    this.traverse((node) => {
      // 检查边界盒是否相交
      if (!this.boundsIntersect(node.bounds, bounds)) {
        return false; // 剪枝：跳过此分支
      }

      // 叶节点：检查所有点
      if (node.isLeaf) {
        for (const index of node.pointIndices) {
          result.add(index);
        }
      }

      return true; // 继续遍历
    });

    return result;
  }

  /**
   * 检查两个边界盒是否相交
   */
  private boundsIntersect(a: Bounds, b: Bounds): boolean {
    return (
      a.min.x <= b.max.x &&
      a.max.x >= b.min.x &&
      a.min.y <= b.max.y &&
      a.max.y >= b.min.y &&
      a.min.z <= b.max.z &&
      a.max.z >= b.min.z
    );
  }

  /**
   * 获取根节点
   */
  getRoot(): OctreeNode | null {
    return this.root;
  }

  /**
   * 清空树
   */
  clear(): void {
    this.root = null;
  }
}
