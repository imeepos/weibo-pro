import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import type {
  UserRelationNetwork,
  UserRelationNode,
  UserRelationEdge,
} from '@sker/sdk';

import { useNodeRenderer } from './NodeRenderer';
import { useLinkRenderer } from './LinkRenderer';
import { PerformanceMonitor } from './PerformanceMonitor';
import { getNodeLabel } from './UserRelationGraph3D.utils';

interface UserRelationGraph3DProps {
  network: UserRelationNetwork;
  className?: string;
  onNodeClick?: (node: UserRelationNode) => void;
  onNodeHover?: (node: UserRelationNode | null) => void;
  showDebugHud?: boolean;
}

export const UserRelationGraph3D: React.FC<UserRelationGraph3DProps> = ({
  network,
  className = '',
  onNodeClick,
  onNodeHover,
  showDebugHud = false,
}) => {
  const fgRef = useRef<any>();
  const [hoverNode, setHoverNode] = useState<UserRelationNode | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.67);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsUpdateIntervalRef = useRef<any>(null);

  const { nodeThreeObject } = useNodeRenderer({ highlightNodes });
  const {
    linkMaterial,
    linkWidth,
    linkDirectionalParticles,
    linkDirectionalParticleWidth,
    linkDirectionalParticleSpeed,
  } = useLinkRenderer();

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


  return (
    <div className={`relative ${className}`}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={getNodeLabel}
        nodeThreeObject={nodeThreeObject}
        linkMaterial={linkMaterial}
        linkWidth={linkWidth}
        linkOpacity={0.4}
        linkDirectionalParticles={linkDirectionalParticles}
        linkDirectionalParticleWidth={linkDirectionalParticleWidth}
        linkDirectionalParticleSpeed={linkDirectionalParticleSpeed}
        linkCurvature={0.1}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        backgroundColor='rgba(0, 0, 0, 0)'
        showNavInfo={false}
        controlType="orbit"
        enableNodeDrag={true}
        enableNavigationControls={true}
        enablePointerInteraction={true}
      />

      <PerformanceMonitor
        showDebugHud={showDebugHud}
        fps={fps}
        frameTime={frameTime}
        nodesCount={graphData.nodes.length}
        linksCount={graphData.links.length}
      />
    </div>
  );
};

export default UserRelationGraph3D;