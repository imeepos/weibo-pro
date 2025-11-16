import React, { useCallback } from 'react';
import * as THREE from 'three';
import { getUserTypeColor } from './UserRelationGraph3D.utils';
import {
  getUserNodeShape,
  createShapeGeometry,
  calculateNodeOpacity,
  createPulseAnimation,
  getCommunityColor,
  detectCommunity
} from './NodeShapeUtils';

interface NodeRendererProps {
  highlightNodes: Set<string>;
  enableShapes?: boolean;
  enableOpacity?: boolean;
  enablePulse?: boolean;
  enableCommunities?: boolean;
  edges?: any[];
}

export const useNodeRenderer = ({
  highlightNodes,
  enableShapes = true,
  enableOpacity = true,
  enablePulse = false,
  enableCommunities = false,
  edges = []
}: NodeRendererProps) => {
  const nodeThreeObject = useCallback((node: any) => {
    const nodeWithConnections = node as any;
    const group = new THREE.Group();

    // 使用 val 属性作为节点半径（已在父组件中计算）
    let radius = nodeWithConnections.val || 3;

    // 应用脉动动画
    if (enablePulse) {
      radius = createPulseAnimation(radius, Date.now() / 1000);
    }

    // 确定节点形状
    const shape = enableShapes ? getUserNodeShape(node.userType) : 'sphere';
    const geometry = createShapeGeometry(shape, radius);

    // 确定节点颜色
    let nodeColor;
    if (enableCommunities) {
      const communityId = detectCommunity(node.id, edges);
      nodeColor = new THREE.Color(getCommunityColor(communityId));
    } else {
      nodeColor = new THREE.Color(getUserTypeColor(node.userType));
    }

    // 计算透明度
    const opacity = enableOpacity ? calculateNodeOpacity(node.lastActive) : 1.0;

    // 创建发光材质
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

    // 添加WIRED线框效果
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

    // 内发光光晕
    const glowGeometry = createShapeGeometry(shape, radius * 1.15);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: nodeColor,
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
  }, [highlightNodes, enableShapes, enableOpacity, enablePulse, enableCommunities, edges]);

  return { nodeThreeObject };
};