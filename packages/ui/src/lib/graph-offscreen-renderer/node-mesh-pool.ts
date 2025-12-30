/**
 * 节点 Mesh 池
 * 使用 InstancedMesh 高效渲染大量节点
 */

import * as THREE from 'three';
import type { NodeMeshPoolConfig } from './types';

export class NodeMeshPool {
  private mesh: THREE.InstancedMesh;
  private nodeCount: number = 0;
  private maxNodes: number;

  // 缓存对象（避免重复创建）
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor(config: NodeMeshPoolConfig) {
    this.maxNodes = config.maxNodes;
    this.initMesh();
  }

  /**
   * 初始化 InstancedMesh
   */
  private initMesh(): void {
    // 使用较低多边形的球体几何体（性能优化）
    const geometry = new THREE.SphereGeometry(1, 16, 16);

    // 使用 MeshStandardMaterial（支持光照）
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.2,
      roughness: 0.8,
      emissive: 0x000000,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, this.maxNodes);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // 启用实例颜色
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }

    // 初始化为不可见
    this.mesh.count = 0;
  }

  /**
   * 更新节点数量
   */
  setNodeCount(count: number): void {
    this.nodeCount = Math.min(count, this.maxNodes);
    this.mesh.count = this.nodeCount;
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

    for (let i = 0; i < this.nodeCount; i++) {
      const idx = i * 3;

      // 更新位置和缩放
      this.dummy.position.set(positions[idx], positions[idx + 1], positions[idx + 2]);
      this.dummy.scale.setScalar(sizes[i]);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      // 更新颜色
      if (this.mesh.instanceColor) {
        this.color.setRGB(colors[idx], colors[idx + 1], colors[idx + 2]);
        this.mesh.instanceColor.setXYZ(i, this.color.r, this.color.g, this.color.b);
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * 更新可见性（LOD）
   */
  updateVisibility(visibilityMask: Uint8Array): void {
    // 简化版本：只设置 count
    // 完整版本需要重新排列实例顺序
    let visibleCount = 0;
    for (let i = 0; i < this.nodeCount; i++) {
      if (visibilityMask[i]) {
        visibleCount++;
      }
    }
    // 暂时不实现完整的可见性剔除
    // this.mesh.count = visibleCount;
  }

  /**
   * 获取 Mesh 对象（添加到场景）
   */
  getMesh(): THREE.InstancedMesh {
    return this.mesh;
  }

  /**
   * 射线检测（点击拾取）
   */
  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
    this.mesh.raycast(raycaster, intersects);
  }

  /**
   * 销毁
   */
  dispose(): void {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
