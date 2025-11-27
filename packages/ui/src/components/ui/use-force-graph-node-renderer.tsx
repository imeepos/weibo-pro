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
      return new THREE.CylinderGeometry(radius, radius, radius * 2, 32);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(radius, 0);
    case 'sphere':
    default:
      return new THREE.SphereGeometry(radius, 32, 32);
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

    const material = new THREE.MeshStandardMaterial({
      color: nodeColor,
      metalness: 0.3,
      roughness: 0.2,
      emissive: nodeColor,
      emissiveIntensity: 0.1,
      transparent: opacity < 1.0,
      opacity: opacity,
    });
    const sphere = new THREE.Mesh(geometry, material);

    if (enableWireframe) {
      const wireframeGeometry = createShapeGeometry(shape, radius * 1.01);
      const wireframeMaterial = new THREE.MeshStandardMaterial({
        color: nodeColor,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
        emissive: nodeColor,
        emissiveIntensity: 0.2,
      });
      const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
      group.add(wireframe);
    }

    if (enableGlow) {
      const glowGeometry = createShapeGeometry(shape, radius * 1.15);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: nodeColor,
        transparent: true,
        opacity: 0.1,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      group.add(glow);
    }

    if (highlightNodes.has(node.id)) {
      const ringGeometry = new THREE.TorusGeometry(radius * 1.3, 0.3, 16, 100);
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8,
      });
      const outerRing = new THREE.Mesh(ringGeometry, ringMaterial);

      const innerRingGeometry = new THREE.TorusGeometry(radius * 1.2, 0.1, 8, 100);
      const innerRingMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);

      group.add(outerRing);
      group.add(innerRing);
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
