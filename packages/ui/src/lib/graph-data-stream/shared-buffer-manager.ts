/**
 * SharedArrayBuffer 管理器
 * 管理图数据的共享内存，用于 Worker 间零拷贝数据传输
 */

import type { SharedBuffers, SharedBufferViews, SharedBufferConfig } from './types';

export class SharedBufferManager {
  private positionBuffer: SharedArrayBuffer | ArrayBuffer;
  private velocityBuffer: SharedArrayBuffer | ArrayBuffer;
  private colorBuffer: SharedArrayBuffer | ArrayBuffer;
  private sizeBuffer: SharedArrayBuffer | ArrayBuffer;
  private edgeIndexBuffer: SharedArrayBuffer | ArrayBuffer;
  private edgeWeightBuffer: SharedArrayBuffer | ArrayBuffer;

  private views: SharedBufferViews;
  private config: Required<SharedBufferConfig>;

  constructor(config: SharedBufferConfig) {
    this.config = {
      maxNodes: config.maxNodes,
      maxEdges: config.maxEdges,
      useSharedArrayBuffer: config.useSharedArrayBuffer ?? this.isSharedArrayBufferSupported(),
    };

    this.initBuffers();
    this.createViews();
  }

  /**
   * 检测 SharedArrayBuffer 支持
   */
  private isSharedArrayBufferSupported(): boolean {
    try {
      // 尝试创建 SharedArrayBuffer
      new SharedArrayBuffer(1);
      return true;
    } catch {
      console.warn('⚠️ SharedArrayBuffer 不可用，降级使用 ArrayBuffer（性能略降）');
      return false;
    }
  }

  /**
   * 初始化缓冲区
   */
  private initBuffers(): void {
    const BufferConstructor = this.config.useSharedArrayBuffer
      ? SharedArrayBuffer
      : ArrayBuffer;

    const { maxNodes, maxEdges } = this.config;

    // 节点数据缓冲区
    this.positionBuffer = new BufferConstructor(maxNodes * 3 * 4); // Float32 x 3 (x, y, z)
    this.velocityBuffer = new BufferConstructor(maxNodes * 3 * 4); // Float32 x 3 (vx, vy, vz)
    this.colorBuffer = new BufferConstructor(maxNodes * 3 * 4);    // Float32 x 3 (r, g, b)
    this.sizeBuffer = new BufferConstructor(maxNodes * 4);          // Float32

    // 边数据缓冲区
    this.edgeIndexBuffer = new BufferConstructor(maxEdges * 2 * 4); // Uint32 x 2 (source, target)
    this.edgeWeightBuffer = new BufferConstructor(maxEdges * 4);    // Float32
  }

  /**
   * 创建 TypedArray 视图
   */
  private createViews(): void {
    this.views = {
      positions: new Float32Array(this.positionBuffer),
      velocities: new Float32Array(this.velocityBuffer),
      colors: new Float32Array(this.colorBuffer),
      sizes: new Float32Array(this.sizeBuffer),
      edgeIndices: new Uint32Array(this.edgeIndexBuffer),
      edgeWeights: new Float32Array(this.edgeWeightBuffer),
    };
  }

  /**
   * 获取所有缓冲区（用于传递给 Worker）
   */
  getBuffers(): SharedBuffers {
    return {
      position: this.positionBuffer as SharedArrayBuffer,
      velocity: this.velocityBuffer as SharedArrayBuffer,
      color: this.colorBuffer as SharedArrayBuffer,
      size: this.sizeBuffer as SharedArrayBuffer,
      edgeIndex: this.edgeIndexBuffer as SharedArrayBuffer,
      edgeWeight: this.edgeWeightBuffer as SharedArrayBuffer,
    };
  }

  /**
   * 获取视图（用于主线程读取）
   */
  getViews(): SharedBufferViews {
    return this.views;
  }

  /**
   * 更新单个节点位置（原子操作）
   */
  updatePosition(index: number, x: number, y: number, z: number): void {
    const base = index * 3;
    if (this.config.useSharedArrayBuffer) {
      // 使用原子操作确保线程安全
      Atomics.store(this.views.positions as any, base, x);
      Atomics.store(this.views.positions as any, base + 1, y);
      Atomics.store(this.views.positions as any, base + 2, z);
    } else {
      this.views.positions[base] = x;
      this.views.positions[base + 1] = y;
      this.views.positions[base + 2] = z;
    }
  }

  /**
   * 批量更新位置（性能优化）
   */
  batchUpdatePositions(positions: Float32Array, offset: number = 0): void {
    this.views.positions.set(positions, offset);
  }

  /**
   * 批量更新颜色
   */
  batchUpdateColors(colors: Float32Array, offset: number = 0): void {
    this.views.colors.set(colors, offset);
  }

  /**
   * 批量更新大小
   */
  batchUpdateSizes(sizes: Float32Array, offset: number = 0): void {
    this.views.sizes.set(sizes, offset);
  }

  /**
   * 批量更新边索引
   */
  batchUpdateEdgeIndices(indices: Uint32Array, offset: number = 0): void {
    this.views.edgeIndices.set(indices, offset);
  }

  /**
   * 批量更新边权重
   */
  batchUpdateEdgeWeights(weights: Float32Array, offset: number = 0): void {
    this.views.edgeWeights.set(weights, offset);
  }

  /**
   * 清空所有缓冲区
   */
  clear(): void {
    this.views.positions.fill(0);
    this.views.velocities.fill(0);
    this.views.colors.fill(0);
    this.views.sizes.fill(0);
    this.views.edgeIndices.fill(0);
    this.views.edgeWeights.fill(0);
  }

  /**
   * 获取内存使用情况（字节）
   */
  getMemoryUsage(): number {
    return (
      this.positionBuffer.byteLength +
      this.velocityBuffer.byteLength +
      this.colorBuffer.byteLength +
      this.sizeBuffer.byteLength +
      this.edgeIndexBuffer.byteLength +
      this.edgeWeightBuffer.byteLength
    );
  }

  /**
   * 销毁（释放引用）
   */
  dispose(): void {
    // TypedArray 会自动 GC，只需清空引用
    (this.views as any) = null;
  }
}
