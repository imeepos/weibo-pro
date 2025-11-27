import type { Community } from '@sker/ui/components/ui/graph-community-detector';
import {
  type NodeShape,
  createShapeGeometry,
  createPulseAnimation,
  calculateOpacityByTimestamp
} from '@sker/ui/components/ui/graph-geometry-utils';

export type { NodeShape };
export { createShapeGeometry, createPulseAnimation };

export interface CommunityMapping {
  nodeToCommunity: Map<string, number>;
  communities: Community[];
}

export const getUserNodeShape = (userType: string): NodeShape => {
  const shapeMap: Record<string, NodeShape> = {
    'official': 'cube',
    'media': 'cylinder',
    'kol': 'dodecahedron',
    'normal': 'sphere'
  };
  return shapeMap[userType] || 'sphere';
};

export const calculateNodeOpacity = (lastActive?: string): number =>
  calculateOpacityByTimestamp(lastActive);

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