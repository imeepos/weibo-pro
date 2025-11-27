import * as THREE from 'three';

export type NodeShape = 'sphere' | 'cube' | 'cylinder' | 'dodecahedron';

export const createShapeGeometry = (shape: NodeShape, radius: number): THREE.BufferGeometry => {
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

export const createPulseAnimation = (
  baseRadius: number,
  currentTime: number,
  pulseFrequency: number = 2,
  pulseAmplitude: number = 0.1
): number => {
  const pulse = Math.sin(currentTime * pulseFrequency * Math.PI * 2) * pulseAmplitude;
  return baseRadius * (1 + pulse);
};

export const calculateOpacityByTimestamp = (
  timestamp: number | string | undefined,
  thresholds: { day: number; week: number; month: number; old: number } = {
    day: 1.0,
    week: 0.8,
    month: 0.6,
    old: 0.3
  }
): number => {
  if (!timestamp) return 1.0;

  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const daysSince = Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24));

  if (daysSince <= 1) return thresholds.day;
  if (daysSince <= 7) return thresholds.week;
  if (daysSince <= 30) return thresholds.month;
  return thresholds.old;
};
