// 节点形状工具函数
import * as THREE from 'three';

export type NodeShape = 'sphere' | 'cube' | 'cylinder' | 'dodecahedron';

/**
 * 根据用户类型获取节点形状
 */
export const getUserNodeShape = (userType: string): NodeShape => {
  const shapeMap: Record<string, NodeShape> = {
    'official': 'cube',      // 官方账号：立方体
    'media': 'cylinder',     // 媒体账号：圆柱体
    'kol': 'dodecahedron',   // KOL：十二面体
    'normal': 'sphere'       // 普通用户：球体
  };
  return shapeMap[userType] || 'sphere';
};

/**
 * 创建指定形状的几何体
 */
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

/**
 * 基于最近活跃度计算节点透明度
 */
export const calculateNodeOpacity = (lastActive?: string): number => {
  if (!lastActive) return 1.0;

  const daysSinceActive = Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceActive <= 1) return 1.0;      // 今天活跃：完全不透明
  if (daysSinceActive <= 7) return 0.8;      // 一周内活跃：轻微透明
  if (daysSinceActive <= 30) return 0.6;     // 一月内活跃：中等透明
  return 0.3;                                // 超过一月：高度透明
};

/**
 * 创建脉动动画效果
 */
export const createPulseAnimation = (
  baseRadius: number,
  currentTime: number,
  pulseFrequency: number = 2,
  pulseAmplitude: number = 0.1
): number => {
  const pulse = Math.sin(currentTime * pulseFrequency * Math.PI * 2) * pulseAmplitude;
  return baseRadius * (1 + pulse);
};

/**
 * 社群颜色编码
 */
export const getCommunityColor = (communityId: number): string => {
  const communityColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return communityColors[communityId % communityColors.length];
};

/**
 * 检测节点是否属于某个社群（简化版）
 */
export const detectCommunity = (nodeId: string, edges: any[]): number => {
  // 简化的社群检测算法
  // 在实际应用中，应该使用更复杂的社群检测算法如 Louvain
  const hash = nodeId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  return hash % 10; // 返回0-9的社群ID
};