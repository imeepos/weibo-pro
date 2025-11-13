import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import type {
  UserRelationNetwork,
  UserRelationNode,
  UserRelationEdge,
} from '@sker/sdk';

interface UserRelationGraph3DProps {
  network: UserRelationNetwork;
  className?: string;
  onNodeClick?: (node: UserRelationNode) => void;
  onNodeHover?: (node: UserRelationNode | null) => void;
}

const UserRelationGraph3D: React.FC<UserRelationGraph3DProps> = ({
  network,
  className = '',
  onNodeClick,
  onNodeHover,
}) => {
  const fgRef = useRef<any>();
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState<UserRelationNode | null>(null);

  const graphData = useMemo(() => {
    // 计算每个节点的连接数
    const connectionCountMap = new Map<string, number>();

    network.edges.forEach(edge => {
      const source = edge.source.toString();
      const target = edge.target.toString();
      connectionCountMap.set(source, (connectionCountMap.get(source) || 0) + 1);
      connectionCountMap.set(target, (connectionCountMap.get(target) || 0) + 1);
    });

    return {
      nodes: network.nodes.map(node => {
        const connectionCount = connectionCountMap.get(node.id.toString()) || 0;
        return {
          ...node,
          connectionCount,
          val: Math.sqrt(connectionCount) * 2 + 3,
          color: getUserTypeColor(node.userType),
        };
      }),
      links: network.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        value: edge.weight,
        type: edge.type,
      })),
    };
  }, [network]);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-200);
      fgRef.current.d3Force('link').distance(100);
    }
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    if (onNodeClick) {
      onNodeClick(node as UserRelationNode);
    }

    if (fgRef.current) {
      const distance = 300;

      // 获取当前相机位置
      const cameraPosition = fgRef.current.cameraPosition();
      const currentCamera = {
        x: cameraPosition.x,
        y: cameraPosition.y,
        z: cameraPosition.z
      };

      // 计算从节点到当前相机的方向向量
      const direction = {
        x: currentCamera.x - node.x,
        y: currentCamera.y - node.y,
        z: currentCamera.z - node.z
      };

      // 归一化方向向量
      const dirLength = Math.hypot(direction.x, direction.y, direction.z);

      if (dirLength > 0) {
        // 在从节点到相机的方向上，向相机方向后退一定距离
        // 这样节点会保持在屏幕中央
        const ratio = distance / dirLength;

        fgRef.current.cameraPosition(
          {
            x: node.x + direction.x * ratio,
            y: node.y + direction.y * ratio,
            z: node.z + direction.z * ratio
          },
          node, // 节点作为焦点，保持在屏幕中央
          3000
        );
      }
    }
  }, [onNodeClick]);

  const handleNodeHover = useCallback((node: any) => {
    const typedNode = node as UserRelationNode | null;
    setHoverNode(typedNode);

    if (onNodeHover) {
      onNodeHover(typedNode);
    }

    if (node) {
      const neighbors = new Set<string>();
      const links = new Set<string>();

      graphData.links.forEach(link => {
        if (link.source === node.id || (typeof link.source === 'object' && (link.source as any).id === node.id)) {
          const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
          neighbors.add(targetId);
          links.add(`${node.id}-${targetId}`);
        }
        if (link.target === node.id || (typeof link.target === 'object' && (link.target as any).id === node.id)) {
          const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
          neighbors.add(sourceId);
          links.add(`${sourceId}-${node.id}`);
        }
      });

      neighbors.add(node.id);
      setHighlightNodes(neighbors);
      setHighlightLinks(links);
    } else {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
    }
  }, [graphData.links, onNodeHover]);

  const nodeThreeObject = useCallback((node: any) => {
    const nodeWithConnections = node as any;
    const connectionCount = nodeWithConnections.connectionCount || 0;
    const group = new THREE.Group();

    const radius = Math.sqrt(connectionCount) * 2 + 3;

    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshLambertMaterial({
      color: getUserTypeColor(node.userType),
    });
    const sphere = new THREE.Mesh(geometry, material);

    if (highlightNodes.has(node.id) || hoverNode?.id === node.id) {
      const ringGeometry = new THREE.TorusGeometry(radius + 0.5, 0.2, 8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      group.add(ring);
    }

    group.add(sphere);

    return group;
  }, [highlightNodes, hoverNode]);


  return (
    <div className={`relative ${className}`}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={(node: any) => `
          <div style="background: rgba(0,0,0,0.9); color: white; padding: 12px; border-radius: 8px; font-size: 14px;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">${node.name}</div>
            <div>类型: ${getUserTypeLabel(node.userType)}</div>
            <div>粉丝: ${formatNumber(node.followers)}</div>
            <div>发帖: ${formatNumber(node.postCount)}</div>
            <div>影响力: ${node.influence}/100</div>
            ${node.verified ? '<div style="color: #2196f3;">✓ 已认证</div>' : ''}
          </div>
        `}
        nodeThreeObject={nodeThreeObject}
        linkWidth={(link: any) => link.value / 10 + 0.5}
        linkColor={(link: any) => getEdgeColor(link.type)}
        linkOpacity={0.3}
        linkDirectionalParticles={4}
        linkDirectionalParticleWidth={(link: any) => link.value / 20 + 1}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        backgroundColor='rgba(0, 0, 0, 0)'
        showNavInfo={false}
        controlType="orbit"
        enableNodeDrag={true}
        enableNavigationControls={true}
        enablePointerInteraction={true}
      />

      {hoverNode && (
        <div className="absolute top-4 right-4 backdrop-blur-sm bg-background/80 text-foreground p-3 rounded-md shadow-lg max-w-xs border border-border">
          <div className="font-semibold text-base mb-1">{hoverNode.name}</div>
          <div className="text-xs space-y-0.5">
            <div>类型: {getUserTypeLabel(hoverNode.userType)}</div>
            <div>粉丝: {formatNumber(hoverNode.followers)}</div>
            <div>发帖: {formatNumber(hoverNode.postCount)}</div>
            <div>影响力: {hoverNode.influence}/100</div>
            {hoverNode.location && <div>位置: {hoverNode.location}</div>}
            {hoverNode.verified && <div className="text-primary">已认证</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export function getUserTypeColor(userType: string): string {
  switch (userType) {
    case 'official':
      return '#ef4444';
    case 'media':
      return '#3b82f6';
    case 'kol':
      return '#a855f7';
    case 'normal':
      return '#10b981';
    default:
      return '#6b7280';
  }
}

function getUserTypeLabel(userType: string): string {
  switch (userType) {
    case 'official':
      return '官方账号';
    case 'media':
      return '媒体账号';
    case 'kol':
      return 'KOL账号';
    case 'normal':
      return '普通用户';
    default:
      return '未知';
  }
}

function getEdgeColor(type: string): string {
  switch (type) {
    case 'like':
      return '#ec4899';
    case 'comment':
      return '#3b82f6';
    case 'repost':
      return '#8b5cf6';
    case 'comprehensive':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export default UserRelationGraph3D;
