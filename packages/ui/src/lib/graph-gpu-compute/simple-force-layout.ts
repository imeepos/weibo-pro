/**
 * 简化版力导向布局（CPU 实现）
 * 用于小规模图或作为 GPU 版本的降级方案
 */

import type { LayoutConfig, LayoutState, IForceLayout } from './types';

const DEFAULT_CONFIG: LayoutConfig = {
  repulsionStrength: 100,
  attractionStrength: 0.1,
  springLength: 30,
  damping: 0.85,
  theta: 0.5,
  maxIterations: 300,
  minDelta: 0.01,
  dt: 0.016,
  useGPU: false,
  workgroupSize: 256,
};

/**
 * CPU 力导向布局实现
 * 简化版本：直接计算所有节点间的斥力（O(n²)）
 * 适用于 < 5000 节点的小规模图
 */
export class SimpleForceLayout implements IForceLayout {
  private positions: Float32Array;
  private velocities: Float32Array;
  private edgeIndices: Uint32Array;
  private edgeWeights: Float32Array;
  private nodeCount: number = 0;
  private edgeCount: number = 0;
  private config: LayoutConfig;

  // 状态
  private iteration: number = 0;
  private startTime: number = 0;

  // 临时数组（避免重复分配）
  private forces: Float32Array;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.positions = new Float32Array(0);
    this.velocities = new Float32Array(0);
    this.edgeIndices = new Uint32Array(0);
    this.edgeWeights = new Float32Array(0);
    this.forces = new Float32Array(0);
  }

  init(
    positions: Float32Array,
    velocities: Float32Array,
    edgeIndices: Uint32Array,
    edgeWeights: Float32Array,
    nodeCount: number,
    edgeCount: number,
    config: LayoutConfig
  ): void {
    this.positions = positions;
    this.velocities = velocities;
    this.edgeIndices = edgeIndices;
    this.edgeWeights = edgeWeights;
    this.nodeCount = nodeCount;
    this.edgeCount = edgeCount;
    this.config = { ...this.config, ...config };

    // 分配力数组
    this.forces = new Float32Array(nodeCount * 3);

    // 重置状态
    this.iteration = 0;
    this.startTime = performance.now();

    console.log(`🔧 SimpleForceLayout 初始化: ${nodeCount} 节点, ${edgeCount} 边`);
  }

  step(): LayoutState {
    this.iteration++;

    // 1. 清空力
    this.forces.fill(0);

    // 2. 计算斥力（所有节点对）
    this.calculateRepulsion();

    // 3. 计算引力（边）
    this.calculateAttraction();

    // 4. 更新速度和位置
    const delta = this.integrate();

    const energy = this.calculateEnergy();
    const isConverged = delta < this.config.minDelta || this.iteration >= this.config.maxIterations;

    return {
      iteration: this.iteration,
      energy,
      delta,
      isConverged,
      elapsedTime: performance.now() - this.startTime,
    };
  }

  run(iterations: number): LayoutState {
    let state: LayoutState = {
      iteration: 0,
      energy: 0,
      delta: 0,
      isConverged: false,
      elapsedTime: 0,
    };

    for (let i = 0; i < iterations; i++) {
      state = this.step();
      if (state.isConverged) {
        break;
      }
    }

    return state;
  }

  /**
   * 计算斥力（Coulomb's Law）
   */
  private calculateRepulsion(): void {
    const { repulsionStrength } = this.config;

    for (let i = 0; i < this.nodeCount; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      for (let j = i + 1; j < this.nodeCount; j++) {
        const jx = j * 3;
        const jy = jx + 1;
        const jz = jx + 2;

        // 计算距离
        const dx = this.positions[ix] - this.positions[jx];
        const dy = this.positions[iy] - this.positions[jy];
        const dz = this.positions[iz] - this.positions[jz];
        const distSq = dx * dx + dy * dy + dz * dz + 0.01; // 避免除零
        const dist = Math.sqrt(distSq);

        // 计算斥力 F = k / r²
        const force = repulsionStrength / distSq;

        // 归一化方向
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        const fz = (force * dz) / dist;

        // 应用力（牛顿第三定律）
        this.forces[ix] += fx;
        this.forces[iy] += fy;
        this.forces[iz] += fz;

        this.forces[jx] -= fx;
        this.forces[jy] -= fy;
        this.forces[jz] -= fz;
      }
    }
  }

  /**
   * 计算引力（Hooke's Law）
   */
  private calculateAttraction(): void {
    const { attractionStrength, springLength } = this.config;

    for (let i = 0; i < this.edgeCount; i++) {
      const sourceIdx = this.edgeIndices[i * 2];
      const targetIdx = this.edgeIndices[i * 2 + 1];
      const weight = this.edgeWeights[i];

      const sx = sourceIdx * 3;
      const sy = sx + 1;
      const sz = sx + 2;

      const tx = targetIdx * 3;
      const ty = tx + 1;
      const tz = tx + 2;

      // 计算距离
      const dx = this.positions[tx] - this.positions[sx];
      const dy = this.positions[ty] - this.positions[sy];
      const dz = this.positions[tz] - this.positions[sz];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;

      // 计算引力 F = k * (dist - springLength)
      const displacement = dist - springLength;
      const force = attractionStrength * displacement * weight;

      // 归一化方向
      const fx = (force * dx) / dist;
      const fy = (force * dy) / dist;
      const fz = (force * dz) / dist;

      // 应用力
      this.forces[sx] += fx;
      this.forces[sy] += fy;
      this.forces[sz] += fz;

      this.forces[tx] -= fx;
      this.forces[ty] -= fy;
      this.forces[tz] -= fz;
    }
  }

  /**
   * 积分更新位置和速度
   */
  private integrate(): number {
    const { damping, dt } = this.config;
    let maxDelta = 0;

    for (let i = 0; i < this.nodeCount; i++) {
      const idx = i * 3;

      // 更新速度 v = v * damping + F * dt
      this.velocities[idx] = this.velocities[idx] * damping + this.forces[idx] * dt;
      this.velocities[idx + 1] = this.velocities[idx + 1] * damping + this.forces[idx + 1] * dt;
      this.velocities[idx + 2] = this.velocities[idx + 2] * damping + this.forces[idx + 2] * dt;

      // 更新位置 p = p + v * dt
      const dx = this.velocities[idx] * dt;
      const dy = this.velocities[idx + 1] * dt;
      const dz = this.velocities[idx + 2] * dt;

      this.positions[idx] += dx;
      this.positions[idx + 1] += dy;
      this.positions[idx + 2] += dz;

      // 计算最大位移
      const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);
      maxDelta = Math.max(maxDelta, delta);
    }

    return maxDelta;
  }

  /**
   * 计算系统能量
   */
  private calculateEnergy(): number {
    let energy = 0;

    // 动能 = 0.5 * m * v²
    for (let i = 0; i < this.nodeCount; i++) {
      const idx = i * 3;
      const vx = this.velocities[idx];
      const vy = this.velocities[idx + 1];
      const vz = this.velocities[idx + 2];
      energy += 0.5 * (vx * vx + vy * vy + vz * vz);
    }

    return energy;
  }

  dispose(): void {
    // TypedArray 会自动 GC
    this.forces = new Float32Array(0);
  }
}
