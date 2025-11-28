import { useCallback } from 'react';
import * as THREE from 'three';

export interface LinkRendererConfig<TLink = any> {
  getLinkColor?: (link: TLink) => string;
  getLinkWidth?: (link: TLink) => number;
  getLinkOpacity?: (link: TLink) => number;
  getLinkParticles?: (link: TLink) => number;
  getLinkParticleWidth?: (link: TLink) => number;
  getLinkParticleSpeed?: (link: TLink) => number;
  baseOpacity?: number;
  baseWidth?: number;
}

export const useForceGraphLinkRenderer = <TLink extends { value?: number }>(
  config: LinkRendererConfig<TLink> = {}
) => {
  const {
    getLinkColor = () => '#6b7280',
    getLinkWidth = (link) => Math.max(1, (link.value || 1) / 8),
    getLinkOpacity = (link) => {
      const value = link.value || 1;
      return Math.min(0.8, 0.3 + (value / 100) * 0.5);
    },
    getLinkParticles = (link) => {
      const value = link.value || 1;
      return Math.min(10, Math.max(3, value / 10));
    },
    getLinkParticleWidth = (link) => {
      const value = link.value || 1;
      return Math.max(2, value / 15 + 1);
    },
    getLinkParticleSpeed = (link) => {
      const value = link.value || 1;
      return Math.max(0.003, Math.min(0.02, 0.005 + value / 5000));
    },
  } = config;

  const linkMaterial = useCallback((link: TLink) => {
    const edgeColor = new THREE.Color(getLinkColor(link));
    const opacity = getLinkOpacity(link);
    const width = getLinkWidth(link);

    const material = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: opacity,
      linewidth: Math.max(1, width / 5),
    });

    return material;
  }, [getLinkColor, getLinkOpacity, getLinkWidth]);

  const linkWidth = useCallback((link: TLink) => {
    return getLinkWidth(link);
  }, [getLinkWidth]);

  const linkDirectionalParticles = useCallback((link: TLink) => {
    return getLinkParticles(link);
  }, [getLinkParticles]);

  const linkDirectionalParticleWidth = useCallback((link: TLink) => {
    return getLinkParticleWidth(link);
  }, [getLinkParticleWidth]);

  const linkDirectionalParticleSpeed = useCallback((link: TLink) => {
    return getLinkParticleSpeed(link);
  }, [getLinkParticleSpeed]);

  return {
    linkMaterial,
    linkWidth,
    linkDirectionalParticles,
    linkDirectionalParticleWidth,
    linkDirectionalParticleSpeed,
  };
};
