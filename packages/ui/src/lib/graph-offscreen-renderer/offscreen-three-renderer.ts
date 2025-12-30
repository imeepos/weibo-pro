/**
 * OffscreenCanvas Three.js 渲染器
 * 在 Worker 线程中运行的 Three.js 渲染器
 */

import * as THREE from 'three';
import { NodeMeshPool } from './node-mesh-pool';
import type { RendererConfig, RenderConfig, SharedBuffers } from './types';

const DEFAULT_RENDER_CONFIG: RenderConfig = {
  enableEdges: true,
  enableLabels: false,
  enableGlow: false,
  edgeOpacity: 0.3,
  nodeOpacity: 1.0,
};

export class OffscreenThreeRenderer {
  private canvas: OffscreenCanvas;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private nodeMeshPool: NodeMeshPool;

  // 共享缓冲区视图
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private sizes: Float32Array | null = null;

  // 渲染配置
  private config: RendererConfig;
  private renderConfig: RenderConfig = DEFAULT_RENDER_CONFIG;

  // 性能监控
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;

  // 节点数量
  private nodeCount: number = 0;

  constructor(canvas: OffscreenCanvas, config: RendererConfig) {
    this.canvas = canvas;
    this.config = config;

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initMeshPools();
    this.initLights();
  }

  /**
   * 初始化渲染器
   */
  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.config.antialias ?? false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false, // 性能优化
    });

    this.renderer.setSize(this.config.width, this.config.height, false);
    this.renderer.setPixelRatio(this.config.pixelRatio ?? 1);

    // 启用性能优化
    this.renderer.sortObjects = false; // 禁用排序（InstancedMesh 不需要）
  }

  /**
   * 初始化场景
   */
  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor ?? 0x000000);

    // 添加雾效（可选）
    // this.scene.fog = new THREE.Fog(0x000000, 500, 2000);
  }

  /**
   * 初始化相机
   */
  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.config.width / this.config.height,
      1,
      10000
    );
    this.camera.position.z = 500;
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * 初始化 Mesh 池
   */
  private initMeshPools(): void {
    this.nodeMeshPool = new NodeMeshPool({
      maxNodes: this.config.maxNodes,
      instancedRendering: true,
    });

    this.scene.add(this.nodeMeshPool.getMesh());
  }

  /**
   * 初始化光照
   */
  private initLights(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    this.scene.add(directionalLight);

    // 补光
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-100, -100, -100);
    this.scene.add(fillLight);
  }

  /**
   * 设置共享缓冲区
   */
  setBuffers(buffers: SharedBuffers): void {
    this.positions = new Float32Array(buffers.position);
    this.colors = new Float32Array(buffers.color);
    this.sizes = new Float32Array(buffers.size);
  }

  /**
   * 设置节点数量
   */
  setNodeCount(count: number): void {
    this.nodeCount = count;
    this.nodeMeshPool.setNodeCount(count);
  }

  /**
   * 更新渲染（从 SharedArrayBuffer 读取数据）
   */
  update(): void {
    if (!this.positions || !this.colors || !this.sizes) {
      return;
    }

    // 更新节点位置、颜色、大小
    this.nodeMeshPool.updateFromBuffers(
      this.positions,
      this.colors,
      this.sizes,
      this.nodeCount
    );
  }

  /**
   * 渲染一帧
   */
  render(): number {
    // 更新数据
    this.update();

    // 渲染场景
    this.renderer.render(this.scene, this.camera);

    // 计算 FPS
    this.updateFPS();

    return this.fps;
  }

  /**
   * 更新 FPS
   */
  private updateFPS(): void {
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }

  /**
   * 设置相机位置
   */
  setCamera(position: [number, number, number], target: [number, number, number]): void {
    this.camera.position.set(...position);
    this.camera.lookAt(...target);
  }

  /**
   * 调整大小
   */
  resize(width: number, height: number, pixelRatio: number): void {
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(pixelRatio);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * 射线拾取（点击检测）
   */
  pick(x: number, y: number): number {
    // 将屏幕坐标转换为 NDC
    const mouse = new THREE.Vector2(
      (x / this.config.width) * 2 - 1,
      -(y / this.config.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects: THREE.Intersection[] = [];
    this.nodeMeshPool.raycast(raycaster, intersects);

    if (intersects.length > 0) {
      return (intersects[0] as any).instanceId ?? -1;
    }

    return -1;
  }

  /**
   * 设置渲染配置
   */
  setRenderConfig(config: Partial<RenderConfig>): void {
    this.renderConfig = { ...this.renderConfig, ...config };
    // 应用配置（暂时不实现）
  }

  /**
   * 销毁
   */
  dispose(): void {
    this.nodeMeshPool.dispose();
    this.renderer.dispose();
  }
}
