import { useCallback } from 'react';
import * as THREE from 'three';

export type NodeShape = 'sphere' | 'cube' | 'cylinder' | 'dodecahedron';

export interface NodeStyle {
  color?: string | THREE.Color;
  opacity?: number;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
}

export interface NodeHighlight {
  enabled: boolean;
  color?: string | number;
  ringColor?: string | number;
}

export interface NodeRendererConfig<TNode = any> {
  highlightNodes?: Set<string | number>;
  getNodeShape?: (node: TNode) => NodeShape;
  getNodeColor?: (node: TNode) => string;
  getNodeOpacity?: (node: TNode) => number;
  enablePulse?: boolean;
  pulseFrequency?: number;
  pulseAmplitude?: number;
  enableWireframe?: boolean;
  enableGlow?: boolean;
  getNodeRadius?: (node: TNode) => number;
}

const createShapeGeometry = (shape: NodeShape, radius: number): THREE.BufferGeometry => {
  switch (shape) {
    case 'cube':
      return new THREE.BoxGeometry(radius * 1.5, radius * 1.5, radius * 1.5);
    case 'cylinder':
      return new THREE.CylinderGeometry(radius, radius, radius * 2, 8);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(radius, 0);
    case 'sphere':
    default:
      // 性能优化：从32x32降低到6x4，大幅减少顶点数（从1024个面降至24个面）
      return new THREE.SphereGeometry(radius, 6, 4);
  }
};

const createPulseAnimation = (
  baseRadius: number,
  currentTime: number,
  pulseFrequency: number = 2,
  pulseAmplitude: number = 0.1
): number => {
  const pulse = Math.sin(currentTime * pulseFrequency * Math.PI * 2) * pulseAmplitude;
  return baseRadius * (1 + pulse);
};

export const useForceGraphNodeRenderer = <TNode extends { id: string | number; val?: number }>(
  config: NodeRendererConfig<TNode> = {}
) => {
  const {
    highlightNodes = new Set(),
    getNodeShape = () => 'sphere',
    getNodeColor = () => '#6b7280',
    getNodeOpacity = () => 1.0,
    enablePulse = false,
    pulseFrequency = 2,
    pulseAmplitude = 0.1,
    enableWireframe = true,
    enableGlow = true,
    getNodeRadius = (node) => node.val || 3,
  } = config;

  const nodeThreeObject = useCallback((node: TNode) => {
    const group = new THREE.Group();

    let radius = getNodeRadius(node);

    if (enablePulse) {
      radius = createPulseAnimation(radius, Date.now() / 1000, pulseFrequency, pulseAmplitude);
    }

    const shape = getNodeShape(node);
    const geometry = createShapeGeometry(shape, radius);

    const nodeColor = new THREE.Color(getNodeColor(node));
    const opacity = getNodeOpacity(node);

    // 性能优化：使用MeshBasicMaterial替代MeshStandardMaterial，无需光照计算
    const material = new THREE.MeshBasicMaterial({
      color: nodeColor,
      transparent: opacity < 1.0,
      opacity: opacity,
    });
    const sphere = new THREE.Mesh(geometry, material);

    // 性能优化：禁用wireframe和glow，减少mesh数量到原来的1/3
    // if (enableWireframe) { ... }
    // if (enableGlow) { ... }

    if (highlightNodes.has(node.id)) {
      // 性能优化：简化高亮环几何体，从16x100降至4x12
      const ringGeometry = new THREE.TorusGeometry(radius * 1.3, 0.3, 4, 12);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8,
      });
      const outerRing = new THREE.Mesh(ringGeometry, ringMaterial);
      group.add(outerRing);

      // 性能优化：移除内环，减少mesh数量
      // const innerRing = ...
    }

    group.add(sphere);

    return group;
  }, [
    highlightNodes,
    getNodeShape,
    getNodeColor,
    getNodeOpacity,
    enablePulse,
    pulseFrequency,
    pulseAmplitude,
    enableWireframe,
    enableGlow,
    getNodeRadius,
  ]);

  return { nodeThreeObject };
};
