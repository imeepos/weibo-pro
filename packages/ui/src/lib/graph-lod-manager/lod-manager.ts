/**
 * LOD 管理器
 * 根据相机位置和视锥体动态管理节点的细节层次
 */

import * as THREE from 'three';
import { Octree } from './octree';
import { getLODLevel, calculateDistance, DEFAULT_LOD_LEVELS } from './lod-levels';
import type {
  LODManagerConfig,
  LODUpdateResult,
  FrustumCullingResult,
  } from './types';

const DEFAULT_CONFIG: Required<Omit<LODManagerConfig, 'levels'>> = {
  octreeConfig: {
    maxPointsPerNode: 100,
    maxDepth: 10,
  },
  enableFrustumCulling: true,
  enableOcclusion: false,
};

export class LODManager {
  private octree: Octree;
  private config: Required<LODManagerConfig>;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private positions: Float32Array | null = null;
  private nodeCount: number = 0;

  constructor(config: Partial<LODManagerConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      levels: config.levels || DEFAULT_LOD_LEVELS,
      octreeConfig: config.octreeConfig || DEFAULT_CONFIG.octreeConfig,
      enableFrustumCulling: config.enableFrustumCulling ?? true,
      enableOcclusion: config.enableOcclusion ?? false,
    };

    this.octree = new Octree(this.config.octreeConfig);
  }

  /**
   * 初始化（构建 Octree）
   */
  init(positions: Float32Array, nodeCount: number): void {
    this.positions = positions;
    this.nodeCount = nodeCount;
    this.octree.build(positions, nodeCount);
  }

  /**
   * 更新 LOD（每帧调用）
   */
  update(camera: THREE.Camera): LODUpdateResult {
    if (!this.positions) {
      return this.getEmptyResult();
    }

    const startTime = performance.now();

    // 1. 更新视锥体
    this.updateFrustum(camera);

    // 2. 视锥体剔除
    const frustumResult = this.config.enableFrustumCulling
      ? this.performFrustumCulling()
      : this.getAllIndices();

    // 3. LOD 分配
    const result = this.assignLOD(camera, frustumResult.visibleIndices);

    const elapsed = performance.now() - startTime;
    if (elapsed > 10) {
      // 只在耗时较长时输出
      console.log(`⚡ LOD 更新耗时: ${elapsed.toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * 更新视锥体
   */
  private updateFrustum(camera: THREE.Camera): void {
    const projectionMatrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(projectionMatrix);
  }

  /**
   * 执行视锥体剔除
   */
  private performFrustumCulling(): FrustumCullingResult {
    const visibleIndices = new Set<number>();
    let culledCount = 0;

    // 遍历 Octree 进行视锥体剔除
    this.octree.traverse((node) => {
      // 创建 Three.js Box3 用于视锥体测试
      const box = new THREE.Box3(
        new THREE.Vector3(node.bounds.min.x, node.bounds.min.y, node.bounds.min.z),
        new THREE.Vector3(node.bounds.max.x, node.bounds.max.y, node.bounds.max.z)
      );

      // 检查边界盒是否在视锥体内
      if (!this.frustum.intersectsBox(box)) {
        culledCount += node.pointIndices.length;
        return false; // 剪枝：跳过该分支
      }

      // 叶节点：添加所有点
      if (node.isLeaf) {
        for (const index of node.pointIndices) {
          visibleIndices.add(index);
        }
      }

      return true; // 继续遍历子节点
    });

    return { visibleIndices, culledCount };
  }

  /**
   * 获取所有节点索引（禁用剔除时）
   */
  private getAllIndices(): FrustumCullingResult {
    const visibleIndices = new Set<number>();
    for (let i = 0; i < this.nodeCount; i++) {
      visibleIndices.add(i);
    }
    return { visibleIndices, culledCount: 0 };
  }

  /**
   * 分配 LOD 级别
   */
  private assignLOD(
    camera: THREE.Camera,
    visibleIndices: Set<number>
  ): LODUpdateResult {
    const lodAssignments = new Map<number, number>();
    const lodDistribution: Record<number, number> = {};
    const cameraPosition = camera.position;

    // 初始化统计
    for (const level of this.config.levels) {
      lodDistribution[level.id] = 0;
    }

    // 为每个可见节点分配 LOD 级别
    for (const index of visibleIndices) {
      // 获取节点位置
      const nodePos = {
        x: this.positions![index * 3],
        y: this.positions![index * 3 + 1],
        z: this.positions![index * 3 + 2],
      };

      // 计算距离
      const distance = calculateDistance(nodePos, cameraPosition);

      // 获取对应的 LOD 级别
      const level = getLODLevel(distance, this.config.levels);

      // 分配
      lodAssignments.set(index, level.id);
      lodDistribution[level.id]++;
    }

    return {
      visibleNodeIndices: visibleIndices,
      lodAssignments,
      culledCount: this.nodeCount - visibleIndices.size,
      totalVisible: visibleIndices.size,
      lodDistribution,
    };
  }

  /**
   * 获取空结果
   */
  private getEmptyResult(): LODUpdateResult {
    return {
      visibleNodeIndices: new Set(),
      lodAssignments: new Map(),
      culledCount: 0,
      totalVisible: 0,
      lodDistribution: {},
    };
  }

  /**
   * 清理
   */
  dispose(): void {
    this.octree.clear();
    this.positions = null;
  }
}
