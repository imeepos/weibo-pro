/**
 * 节点 Mesh 池（支持 LOD）
 * 使用多个 InstancedMesh 高效渲染不同细节层次的节点
 */

import * as THREE from 'three';
import type { NodeMeshPoolConfig } from './types';

/**
 * LOD 几何体类型
 */
type LODGeometry = 'sphere-32' | 'sphere-16' | 'sphere-8' | 'point';

/**
 * LOD 层级配置
 */
interface LODMeshConfig {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  mesh: THREE.InstancedMesh;
  nodeIndices: number[]; // 该 LOD 层的节点索引映射
}

export class NodeMeshPool {
  private lodMeshes: Map<number, LODMeshConfig> = new Map();
  private nodeCount: number = 0;
  private maxNodes: number;
  private lodLevels: number;

  // LOD 分配（nodeIndex -> lodLevel）
  private lodAssignments: Map<number, number> = new Map();
  private visibleIndices: Set<number> = new Set();

  // 缓存对象（避免重复创建）
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor(config: NodeMeshPoolConfig) {
    this.maxNodes = config.maxNodes;
    this.lodLevels = config.lodLevels || 5;
    this.initLODMeshes();
  }

  /**
   * 初始化所有 LOD 层级的 InstancedMesh
   */
  private initLODMeshes(): void {
    const lodConfigs: Array<{ level: number; geometryType: LODGeometry; segments?: number }> = [
      { level: 0, geometryType: 'sphere-32', segments: 32 },
      { level: 1, geometryType: 'sphere-16', segments: 16 },
      { level: 2, geometryType: 'sphere-8', segments: 8 },
      { level: 3, geometryType: 'point' },
      { level: 4, geometryType: 'point' },
    ];

    for (const { level, geometryType, segments } of lodConfigs) {
      if (level >= this.lodLevels) continue;

      const geometry = this.createGeometry(geometryType, segments);
      const material = this.createMaterial();
      const mesh = new THREE.InstancedMesh(geometry, material, this.maxNodes);

      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (mesh.instanceColor) {
        mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      }

      // 初始化为不可见
      mesh.count = 0;

      this.lodMeshes.set(level, {
        geometry,
        material,
        mesh,
        nodeIndices: [],
      });
    }
  }

  /**
   * 创建几何体
   */
  private createGeometry(type: LODGeometry, segments = 16): THREE.BufferGeometry {
    switch (type) {
      case 'sphere-32':
        return new THREE.SphereGeometry(1, 32, 32);
      case 'sphere-16':
        return new THREE.SphereGeometry(1, 16, 16);
      case 'sphere-8':
        return new THREE.SphereGeometry(1, 8, 8);
      case 'point':
        // 对于点，使用非常低多边形的球体或者点几何体
        return new THREE.SphereGeometry(1, 4, 4);
      default:
        return new THREE.SphereGeometry(1, 16, 16);
    }
  }

  /**
   * 创建材质
   */
  private createMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.3, // 增加金属感
      roughness: 0.6, // 降低粗糙度，更光滑
      emissive: 0x000000,
      emissiveIntensity: 0.2, // 添加自发光强度
    });
  }

  /**
   * 更新节点数量
   */
  setNodeCount(count: number): void {
    this.nodeCount = Math.min(count, this.maxNodes);
    // 初始化所有节点为 LOD 0（默认）
    for (let i = 0; i < this.nodeCount; i++) {
      if (!this.lodAssignments.has(i)) {
        this.lodAssignments.set(i, 0);
      }
      this.visibleIndices.add(i);
    }
  }

  /**
   * 更新 LOD 分配
   */
  updateLOD(lodAssignments: Map<number, number>, visibleIndices: Set<number>): void {
    this.lodAssignments = lodAssignments;
    this.visibleIndices = visibleIndices;

    // 重新分配节点到各 LOD 层级
    this.rebuildLODMeshes();
  }

  /**
   * 从 SharedArrayBuffer 更新位置和颜色
   */
  updateFromBuffers(
    positions: Float32Array,
    colors: Float32Array,
    sizes: Float32Array,
    count: number
  ): void {
    this.setNodeCount(count);

    // 按 LOD 层级更新各个 Mesh
    for (const [lodLevel, config] of this.lodMeshes) {
      const { mesh, nodeIndices } = config;

      for (let i = 0; i < nodeIndices.length; i++) {
        const nodeIndex = nodeIndices[i];
        const idx = nodeIndex * 3;

        // 更新位置和缩放
        this.dummy.position.set(positions[idx], positions[idx + 1], positions[idx + 2]);
        this.dummy.scale.setScalar(sizes[nodeIndex]);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);

        // 更新颜色
        if (mesh.instanceColor) {
          this.color.setRGB(colors[idx], colors[idx + 1], colors[idx + 2]);
          mesh.instanceColor.setXYZ(i, this.color.r, this.color.g, this.color.b);
        }
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  /**
   * 重建 LOD Meshes（重新分配节点到各层级）
   */
  private rebuildLODMeshes(): void {
    // 清空所有层级的节点索引
    for (const config of this.lodMeshes.values()) {
      config.nodeIndices = [];
    }

    // 根据 LOD 分配重新分配节点
    for (const nodeIndex of this.visibleIndices) {
      const lodLevel = this.lodAssignments.get(nodeIndex) || 0;
      const config = this.lodMeshes.get(lodLevel);

      if (config) {
        config.nodeIndices.push(nodeIndex);
      }
    }

    // 更新各层级的 count
    for (const config of this.lodMeshes.values()) {
      config.mesh.count = config.nodeIndices.length;
    }
  }

  /**
   * 更新可见性（LOD）- 已被 updateLOD 替代
   */
  updateVisibility(visibilityMask: Uint8Array): void {
    this.visibleIndices.clear();
    for (let i = 0; i < this.nodeCount; i++) {
      if (visibilityMask[i]) {
        this.visibleIndices.add(i);
      }
    }
    this.rebuildLODMeshes();
  }

  /**
   * 获取所有 Mesh 对象（添加到场景）
   */
  getMeshes(): THREE.InstancedMesh[] {
    return Array.from(this.lodMeshes.values()).map((config) => config.mesh);
  }

  /**
   * 获取 Mesh 对象（添加到场景）- 向后兼容
   */
  getMesh(): THREE.InstancedMesh {
    // 返回 LOD 0 的 mesh（向后兼容）
    const config = this.lodMeshes.get(0);
    if (!config) {
      throw new Error('LOD 0 mesh not found');
    }
    return config.mesh;
  }

  /**
   * 射线检测（点击拾取）
   */
  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
    for (const config of this.lodMeshes.values()) {
      config.mesh.raycast(raycaster, intersects);
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalNodes: number;
    visibleNodes: number;
    lodDistribution: Record<number, number>;
  } {
    const lodDistribution: Record<number, number> = {};

    for (const [lodLevel, config] of this.lodMeshes) {
      lodDistribution[lodLevel] = config.nodeIndices.length;
    }

    return {
      totalNodes: this.nodeCount,
      visibleNodes: this.visibleIndices.size,
      lodDistribution,
    };
  }

  /**
   * 销毁
   */
  dispose(): void {
    for (const config of this.lodMeshes.values()) {
      config.geometry.dispose();
      if (Array.isArray(config.material)) {
        config.material.forEach((m) => m.dispose());
      } else {
        config.material.dispose();
      }
    }
    this.lodMeshes.clear();
  }
}
