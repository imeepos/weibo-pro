// 节点形状工具函数
import * as THREE from 'three';
import type { Community } from './CommunityDetector';

export type NodeShape = 'sphere' | 'cube' | 'cylinder' | 'dodecahedron';

export interface CommunityMapping {
  nodeToCommunity: Map<string, number>;
  communities: Community[];
}

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
 * 检测节点是否属于某个社群（基于真实社群检测）
 */
export const detectCommunity = (
  nodeId: string,
  edges: any[],
  communityMapping?: CommunityMapping
): number => {
  // 如果有真实的社群检测结果，使用它
  if (communityMapping && communityMapping.nodeToCommunity.has(nodeId)) {
    return communityMapping.nodeToCommunity.get(nodeId)!;
  }

  // 否则使用简化的回退算法
  const hash = nodeId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  return hash % 10; // 返回0-9的社群ID
};

/**
 * 获取社群颜色
 */
export const getCommunityColor = (communityId: number, communities?: Community[]): string => {
  // 如果有真实的社群信息，使用社群的颜色
  if (communities) {
    const community = communities.find(c => c.id === communityId);
    if (community) {
      return community.color;
    }
  }

  // 否则使用默认颜色
  const communityColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return communityColors[communityId % communityColors.length];
};