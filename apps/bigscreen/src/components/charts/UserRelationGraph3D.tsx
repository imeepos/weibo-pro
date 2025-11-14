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
  showDebugHud?: boolean;
}

const UserRelationGraph3D: React.FC<UserRelationGraph3DProps> = ({
  network,
  className = '',
  onNodeClick,
  onNodeHover,
  showDebugHud = false,
}) => {
  const fgRef = useRef<any>();
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.67);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsUpdateIntervalRef = useRef<any>(null);

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

      // 设置初始相机位置，让关系图居中展示
      const bounds = 500; // 根据图的范围估算
      fgRef.current.cameraPosition({
        x: bounds * 0.7,
        y: bounds * 0.5,
        z: bounds
      }, { x: 0, y: 0, z: 0 }, 0); // 看向中心点
    }
  }, []);

  useEffect(() => {
    if (!showDebugHud) return;

    // 清理旧的计时器
    if (fpsUpdateIntervalRef.current) {
      clearInterval(fpsUpdateIntervalRef.current);
    }

    // 每500ms更新一次FPS显示
    fpsUpdateIntervalRef.current = setInterval(() => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;

      if (deltaTime > 0 && frameCountRef.current > 0) {
        const avgFrameTime = deltaTime / frameCountRef.current;
        const currentFps = Math.round(1000 / avgFrameTime);

        setFps(currentFps);
        setFrameTime(parseFloat(avgFrameTime.toFixed(2)));
      }

      // 重置计数器
      frameCountRef.current = 0;
      lastTimeRef.current = currentTime;
    }, 500);

    return () => {
      if (fpsUpdateIntervalRef.current) {
        clearInterval(fpsUpdateIntervalRef.current);
      }
    };
  }, [showDebugHud]);

  const handleRenderFramePre = useCallback(() => {
    if (!showDebugHud) return;
    frameCountRef.current++;
  }, [showDebugHud]);

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

  const nodeThreeObject = useCallback((node: any) => {
    const nodeWithConnections = node as any;
    const connectionCount = nodeWithConnections.connectionCount || 0;
    const group = new THREE.Group();

    const radius = Math.sqrt(connectionCount) * 2 + 3;

    // 节点几何体
    const geometry = new THREE.SphereGeometry(radius, 32, 32);

    // 创建发光材质
    const mainColor = new THREE.Color(getUserTypeColor(node.userType));
    const material = new THREE.MeshStandardMaterial({
      color: mainColor,
      metalness: 0.3,
      roughness: 0.2,
      emissive: mainColor,
      emissiveIntensity: 0.1,
    });
    const sphere = new THREE.Mesh(geometry, material);

    // 添加WIRED线框效果
    const wireframeGeometry = new THREE.SphereGeometry(radius * 1.01, 16, 16);
    const wireframeMaterial = new THREE.MeshStandardMaterial({
      color: mainColor,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      emissive: mainColor,
      emissiveIntensity: 0.2,
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);

    // 内发光光晕
    const glowGeometry = new THREE.SphereGeometry(radius * 1.15, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: mainColor,
      transparent: true,
      opacity: 0.1,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);

    // 悬停或高亮时的外发光环
    if (highlightNodes.has(node.id) || hoverNode?.id === node.id) {
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
        linkMaterial={linkMaterial}
        linkWidth={(link: any) => Math.max(1, link.value / 8)}
        linkOpacity={0.4}
        linkDirectionalParticles={(link: any) => Math.min(10, Math.max(3, link.value / 10))}
        linkDirectionalParticleWidth={(link: any) => Math.max(2, link.value / 15 + 1)}
        linkDirectionalParticleSpeed={(link: any) => Math.max(0.003, Math.min(0.02, 0.005 + link.value / 5000))}
        linkCurvature={0.1}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onRenderFramePre={handleRenderFramePre}
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

      {showDebugHud && (
        <div className="absolute top-20 left-4 backdrop-blur-sm bg-background/50 text-foreground rounded-md p-2 text-xs font-mono">
          <div className="font-bold mb-1">⚡ 性能监控</div>
          <div>FPS: <span className={fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}>{fps}</span></div>
          <div>帧时间: {frameTime}ms</div>
          <div>节点: {graphData.nodes.length}</div>
          <div>边: {graphData.links.length}</div>
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
