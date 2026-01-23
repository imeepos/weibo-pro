import { useMemo } from 'react';
import type { GraphData } from '@sker/ui/components/ui/force-graph-3d';
import type { UserRelationNode } from '@sker/sdk';

export interface CommunityStats {
  communityId: number;
  nodeCount: number;
  color: string;
  members: Array<{ id: string; name: string }>;
}

export interface TopUser {
  id: string;
  name: string;
  degree: number;
  followers?: number;
  influence?: number;
  verified?: boolean;
  userType?: string;
  location?: string;
}

export interface LocationStats {
  location: string;
  count: number;
  percentage: number;
}

export interface GraphStatistics {
  communityStats: CommunityStats[];
  topUsers: TopUser[];
  locationStats: LocationStats[];
}

export const useGraphStatistics = (
  graphData: GraphData | null,
  originalNodes: UserRelationNode[]
): GraphStatistics => {
  // 创建原始节点的映射，用于获取详细信息
  const nodeMap = useMemo(() => {
    const map = new Map<string, UserRelationNode>();
    originalNodes.forEach(node => {
      map.set(node.id, node);
    });
    return map;
  }, [originalNodes]);

  // 计算群组统计
  const communityStats = useMemo<CommunityStats[]>(() => {
    if (!graphData || graphData.nodes.length === 0) {
      return [];
    }

    const communityMap = new Map<number, { nodes: Array<{ id: string; name: string }>; color: string }>();

    graphData.nodes.forEach(node => {
      const communityId = (node as any).communityId;
      if (communityId === undefined) return;

      if (!communityMap.has(communityId)) {
        communityMap.set(communityId, {
          nodes: [],
          color: (node as any).color || '#888888',
        });
      }

      communityMap.get(communityId)!.nodes.push({
        id: String(node.id),
        name: (node as any).name || String(node.id),
      });
    });

    const stats: CommunityStats[] = [];
    communityMap.forEach((value, communityId) => {
      stats.push({
        communityId,
        nodeCount: value.nodes.length,
        color: value.color,
        members: value.nodes,
      });
    });

    // 按节点数量降序排列
    stats.sort((a, b) => b.nodeCount - a.nodeCount);

    // 只返回前10个
    return stats.slice(0, 10);
  }, [graphData]);

  // 计算用户连线排名
  const topUsers = useMemo<TopUser[]>(() => {
    if (!graphData || graphData.nodes.length === 0) {
      return [];
    }

    const users: TopUser[] = graphData.nodes.map(node => {
      const originalNode = nodeMap.get(String(node.id));
      return {
        id: String(node.id),
        name: (node as any).name || String(node.id),
        degree: (node as any).val || 0,
        followers: originalNode?.followers,
        influence: originalNode?.influence,
        verified: originalNode?.verified,
        userType: originalNode?.userType,
        location: originalNode?.location,
      };
    });

    // 按度数降序排列
    users.sort((a, b) => b.degree - a.degree);

    // 只返回前10个
    return users.slice(0, 10);
  }, [graphData, nodeMap]);

  // 计算区域统计
  const locationStats = useMemo<LocationStats[]>(() => {
    if (!graphData || graphData.nodes.length === 0 || originalNodes.length === 0) {
      return [];
    }

    const locationMap = new Map<string, number>();
    let totalCount = 0;

    // 只统计在 graphData 中存在的节点
    const graphNodeIds = new Set(graphData.nodes.map(n => String(n.id)));

    originalNodes.forEach(node => {
      if (!graphNodeIds.has(node.id)) return;

      const location = node.location || '未知';
      locationMap.set(location, (locationMap.get(location) || 0) + 1);
      totalCount++;
    });

    const stats: LocationStats[] = [];
    locationMap.forEach((count, location) => {
      stats.push({
        location,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      });
    });

    // 按数量降序排列
    stats.sort((a, b) => b.count - a.count);

    // 只返回前10个
    return stats.slice(0, 10);
  }, [graphData, originalNodes]);

  return {
    communityStats,
    topUsers,
    locationStats,
  };
};
