import React, { useCallback } from 'react';
import * as THREE from 'three';
import { getUserTypeColor } from './UserRelationGraph3D.utils';

interface NodeRendererProps {
  highlightNodes: Set<string>;
}

export const useNodeRenderer = ({ highlightNodes }: NodeRendererProps) => {
  const nodeThreeObject = useCallback((node: any) => {
    const nodeWithConnections = node as any;
    const connectionCount = nodeWithConnections.connectionCount || 0;
    const group = new THREE.Group();

    const radius = Math.sqrt(connectionCount) * 2 + 3;

    // 节点几何体
    const geometry = new THREE.SphereGeometry(radius, 32, 32);

    // 创建发光材质
    const mainColor = new THREE.Color(getUserTypeColor(node.userType));
    const material = new THREE.MeshStandardMaterial({
      color: mainColor,
      metalness: 0.3,
      roughness: 0.2,
      emissive: mainColor,
      emissiveIntensity: 0.1,
    });
    const sphere = new THREE.Mesh(geometry, material);

    // 添加WIRED线框效果
    const wireframeGeometry = new THREE.SphereGeometry(radius * 1.01, 16, 16);
    const wireframeMaterial = new THREE.MeshStandardMaterial({
      color: mainColor,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      emissive: mainColor,
      emissiveIntensity: 0.2,
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);

    // 内发光光晕
    const glowGeometry = new THREE.SphereGeometry(radius * 1.15, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: mainColor,
      transparent: true,
      opacity: 0.1,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);

    // 悬停或高亮时的外发光环
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

      // 内部光环
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

    group.add(glow);
    group.add(sphere);
    group.add(wireframe);

    return group;
  }, [highlightNodes]);

  return { nodeThreeObject };
};