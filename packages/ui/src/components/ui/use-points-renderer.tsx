import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

export interface PointsRendererConfig<TNode> {
  getNodeColor?: (node: TNode) => string;
  pointSize?: number;
  sizeAttenuation?: boolean;
}

/**
 * 点云渲染器 - 用于渲染大量背景节点
 *
 * 使用 THREE.Points 替代 Mesh，性能提升 100x+
 * 适用于 10k+ 背景层节点
 */
export const usePointsRenderer = <TNode extends { id: string | number; x?: number; y?: number; z?: number }>(
  nodes: TNode[],
  config: PointsRendererConfig<TNode> = {}
) => {
  const {
    getNodeColor = () => '#888888',
    pointSize = 2,
    sizeAttenuation = true,
  } = config;

  const pointsRef = useRef<THREE.Points | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: pointSize,
      sizeAttenuation,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
    });
  }, [pointSize, sizeAttenuation]);

  useEffect(() => {
    if (nodes.length === 0) return;

    // 创建或更新几何体
    if (!geometryRef.current) {
      geometryRef.current = new THREE.BufferGeometry();
    }

    const geometry = geometryRef.current;
    const positions = new Float32Array(nodes.length * 3);
    const colors = new Float32Array(nodes.length * 3);

    nodes.forEach((node, i) => {
      positions[i * 3] = node.x ?? 0;
      positions[i * 3 + 1] = node.y ?? 0;
      positions[i * 3 + 2] = node.z ?? 0;

      const color = new THREE.Color(getNodeColor(node));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // 创建 Points 对象
    if (!pointsRef.current) {
      pointsRef.current = new THREE.Points(geometry, material);
    }

    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
        geometryRef.current = null;
      }
      if (pointsRef.current) {
        pointsRef.current = null;
      }
    };
  }, [nodes, getNodeColor, material]);

  return {
    pointsObject: pointsRef.current,
    updatePositions: (newPositions: Float32Array) => {
      if (geometryRef.current) {
        geometryRef.current.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
        const posAttr = geometryRef.current.getAttribute('position');
        if (posAttr) posAttr.needsUpdate = true;
      }
    },
  };
};
