import React, { useCallback } from 'react';
import * as THREE from 'three';
import { getEdgeColor } from './UserRelationGraph3D.utils';

export const useLinkRenderer = () => {
  const linkMaterial = useCallback((link: any) => {
    const edgeColor = new THREE.Color(getEdgeColor(link.type));
    const value = link.value || 1;

    // 创建渐变色材质
    const material = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: Math.min(0.8, 0.3 + (value / 100) * 0.5),
      linewidth: Math.max(1, value / 5),
    });

    return material;
  }, []);

  const linkWidth = useCallback((link: any) => {
    return Math.max(1, link.value / 8);
  }, []);

  const linkDirectionalParticles = useCallback((link: any) => {
    return Math.min(10, Math.max(3, link.value / 10));
  }, []);

  const linkDirectionalParticleWidth = useCallback((link: any) => {
    return Math.max(2, link.value / 15 + 1);
  }, []);

  const linkDirectionalParticleSpeed = useCallback((link: any) => {
    return Math.max(0.003, Math.min(0.02, 0.005 + link.value / 5000));
  }, []);

  return {
    linkMaterial,
    linkWidth,
    linkDirectionalParticles,
    linkDirectionalParticleWidth,
    linkDirectionalParticleSpeed,
  };
};