/**
 * 边 Mesh 池
 * 使用 LineSegments + InstancedBufferGeometry 高效渲染大量边
 */

import * as THREE from 'three';

export interface EdgeMeshPoolConfig {
  maxEdges: number;
  lineWidth?: number;
  opacity?: number;
}

export class EdgeMeshPool {
  private mesh: THREE.LineSegments;
  private edgeCount: number = 0;
  private maxEdges: number;

  // 位置缓冲区（每条边 2 个顶点，每个顶点 3 个坐标）
  private positionAttribute: THREE.BufferAttribute;

  constructor(config: EdgeMeshPoolConfig) {
    this.maxEdges = config.maxEdges;
    this.initMesh(config);
  }

  /**
   * 初始化 LineSegments
   */
  private initMesh(config: EdgeMeshPoolConfig): void {
    const geometry = new THREE.BufferGeometry();

    // 创建位置缓冲区（每条边 2 个顶点）
    const positions = new Float32Array(this.maxEdges * 2 * 3);
    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.positionAttribute);

    // 添加颜色缓冲区（支持渐变色）
    const colors = new Float32Array(this.maxEdges * 2 * 3);
    const colorAttribute = new THREE.BufferAttribute(colors, 3);
    colorAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('color', colorAttribute);

    // 创建材质 - 启用顶点颜色
    const material = new THREE.LineBasicMaterial({
      vertexColors: true, // 启用顶点颜色
      opacity: config.opacity ?? 0.4, // 提高默认透明度
      transparent: true,
      depthWrite: false, // 性能优化
      blending: THREE.AdditiveBlending, // 使用加法混合，让连线更亮
    });

    this.mesh = new THREE.LineSegments(geometry, material);
    this.mesh.frustumCulled = false; // 禁用视锥体剔除（性能权衡）
  }

  /**
   * 设置边数量
   */
  setEdgeCount(count: number): void {
    this.edgeCount = Math.min(count, this.maxEdges);
    // LineSegments 使用 drawRange 控制渲染数量
    this.mesh.geometry.setDrawRange(0, this.edgeCount * 2);
  }

  /**
   * 从 SharedArrayBuffer 更新边
   */
  updateFromBuffers(
    nodePositions: Float32Array,
    edgeIndices: Uint32Array,
    count: number
  ): void {
    this.setEdgeCount(count);

    const positions = this.positionAttribute.array as Float32Array;

    for (let i = 0; i < this.edgeCount; i++) {
      const sourceIdx = edgeIndices[i * 2];
      const targetIdx = edgeIndices[i * 2 + 1];

      const baseIdx = i * 6; // 每条边 2 个顶点 * 3 个坐标

      // 源节点位置
      positions[baseIdx] = nodePositions[sourceIdx * 3];
      positions[baseIdx + 1] = nodePositions[sourceIdx * 3 + 1];
      positions[baseIdx + 2] = nodePositions[sourceIdx * 3 + 2];

      // 目标节点位置
      positions[baseIdx + 3] = nodePositions[targetIdx * 3];
      positions[baseIdx + 4] = nodePositions[targetIdx * 3 + 1];
      positions[baseIdx + 5] = nodePositions[targetIdx * 3 + 2];
    }

    this.positionAttribute.needsUpdate = true;
  }

  /**
   * 设置不透明度
   */
  setOpacity(opacity: number): void {
    const material = this.mesh.material as THREE.LineBasicMaterial;
    material.opacity = opacity;
    material.needsUpdate = true;
  }

  /**
   * 设置颜色
   */
  setColor(color: number): void {
    const material = this.mesh.material as THREE.LineBasicMaterial;
    material.color.setHex(color);
  }

  /**
   * 获取 Mesh 对象（添加到场景）
   */
  getMesh(): THREE.LineSegments {
    return this.mesh;
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
