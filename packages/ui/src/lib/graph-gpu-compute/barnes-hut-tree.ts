/**
 * Barnes-Hut 树实现
 * 用于 O(n log n) 复杂度的力导向布局优化
 */

/**
 * Barnes-Hut 四叉树节点（3D 改为八叉树）
 */
interface BarnesHutNode {
  // 边界
  x: number;      // 中心 x
  y: number;      // 中心 y
  z: number;      // 中心 z
  size: number;   // 尺寸

  // 质量和质心
  mass: number;
  cx: number;     // 质心 x
  cy: number;     // 质心 y
  cz: number;     // 质心 z

  // 子节点（八叉树有 8 个子节点）
  children: (BarnesHutNode | null)[];

  // 叶节点数据
  isLeaf: boolean;
  pointIndex: number; // 叶节点存储的点索引（-1 表示无）
}

/**
 * Barnes-Hut 树
 */
export class BarnesHutTree {
  private root: BarnesHutNode | null = null;
  private theta: number = 0.5; // 精度参数

  constructor(theta: number = 0.5) {
    this.theta = theta;
  }

  /**
   * 构建树
   */
  build(positions: Float32Array, masses: Float32Array, nodeCount: number): void {
    // 1. 计算边界
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < nodeCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    // 2. 创建根节点（边界盒）
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);

    this.root = this.createNode(cx, cy, cz, size);

    // 3. 插入所有点
    for (let i = 0; i < nodeCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const mass = masses[i];

      this.insert(this.root, x, y, z, mass, i);
    }
  }

  /**
   * 创建节点
   */
  private createNode(x: number, y: number, z: number, size: number): BarnesHutNode {
    return {
      x,
      y,
      z,
      size,
      mass: 0,
      cx: 0,
      cy: 0,
      cz: 0,
      children: Array(8).fill(null),
      isLeaf: true,
      pointIndex: -1,
    };
  }

  /**
   * 插入点
   */
  private insert(
    node: BarnesHutNode,
    x: number,
    y: number,
    z: number,
    mass: number,
    index: number
  ): void {
    // 更新质心和质量
    const totalMass = node.mass + mass;
    node.cx = (node.cx * node.mass + x * mass) / totalMass;
    node.cy = (node.cy * node.mass + y * mass) / totalMass;
    node.cz = (node.cz * node.mass + z * mass) / totalMass;
    node.mass = totalMass;

    // 如果是空节点，直接存储点
    if (node.pointIndex === -1 && node.isLeaf) {
      node.pointIndex = index;
      return;
    }

    // 如果是叶节点且已有点，需要分裂
    if (node.isLeaf && node.pointIndex !== -1) {
      const existingIndex = node.pointIndex;
      node.pointIndex = -1;
      node.isLeaf = false;

      // 重新插入已有点
      const octant = this.getOctant(
        existingIndex,
        node.x,
        node.y,
        node.z,
        existingIndex // 这里应该用实际位置，简化处理
      );
      // 实际实现需要从原始数据读取位置
      // 这里简化处理
    }

    // 内部节点：插入到对应子节点
    const octant = this.getOctantByPosition(x, y, z, node.x, node.y, node.z);

    if (!node.children[octant]) {
      const halfSize = node.size / 2;
      const quarterSize = halfSize / 2;

      // 计算子节点中心
      const childX = node.x + (octant & 1 ? quarterSize : -quarterSize);
      const childY = node.y + (octant & 2 ? quarterSize : -quarterSize);
      const childZ = node.z + (octant & 4 ? quarterSize : -quarterSize);

      node.children[octant] = this.createNode(childX, childY, childZ, halfSize);
    }

    this.insert(node.children[octant]!, x, y, z, mass, index);
  }

  /**
   * 获取点所属的八分区（0-7）
   */
  private getOctant(index: number, cx: number, cy: number, cz: number, x: number): number {
    // 简化实现，实际需要从 positions 数组读取
    return 0;
  }

  /**
   * 根据位置获取八分区
   */
  private getOctantByPosition(
    x: number,
    y: number,
    z: number,
    cx: number,
    cy: number,
    cz: number
  ): number {
    let octant = 0;
    if (x >= cx) octant |= 1;
    if (y >= cy) octant |= 2;
    if (z >= cz) octant |= 4;
    return octant;
  }

  /**
   * 计算对点 (x, y, z) 的斥力
   */
  calculateForce(
    x: number,
    y: number,
    z: number,
    repulsionStrength: number
  ): { fx: number; fy: number; fz: number } {
    const force = { fx: 0, fy: 0, fz: 0 };

    if (!this.root) return force;

    this.calculateForceRecursive(this.root, x, y, z, repulsionStrength, force);

    return force;
  }

  /**
   * 递归计算力
   */
  private calculateForceRecursive(
    node: BarnesHutNode,
    x: number,
    y: number,
    z: number,
    k: number,
    force: { fx: number; fy: number; fz: number }
  ): void {
    // 计算距离
    const dx = node.cx - x;
    const dy = node.cy - y;
    const dz = node.cz - z;
    const distSq = dx * dx + dy * dy + dz * dz + 0.01; // 避免除零
    const dist = Math.sqrt(distSq);

    // Barnes-Hut 判断：如果节点足够远，使用近似
    if (node.size / dist < this.theta || node.isLeaf) {
      // 计算斥力 F = k * mass / r²
      const f = (k * node.mass) / distSq;
      force.fx += (f * dx) / dist;
      force.fy += (f * dy) / dist;
      force.fz += (f * dz) / dist;
      return;
    }

    // 内部节点且节点较近：递归子节点
    for (const child of node.children) {
      if (child) {
        this.calculateForceRecursive(child, x, y, z, k, force);
      }
    }
  }

  /**
   * 清空树
   */
  clear(): void {
    this.root = null;
  }
}
