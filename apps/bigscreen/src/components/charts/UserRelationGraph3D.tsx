import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import type { UserRelationNetwork, UserRelationNode } from '@sker/sdk';

import { ForceGraph3D, type ForceGraph3DHandle } from '@sker/ui/components/ui/force-graph-3d';
import { useInstancedNodeRenderer } from '@sker/ui/components/ui/use-instanced-node-renderer';
import { usePointsRenderer } from '@sker/ui/components/ui/use-points-renderer';
import { DEFAULT_LINK_CONFIG, type LinkDistanceConfig } from './LinkDistanceCalculator';
import { DEFAULT_PERFORMANCE_CONFIG, type PerformanceConfig } from '@sker/ui/lib/graph-performance-optimizer';
import { DEFAULT_WEIGHTS, type NodeSizeWeights } from './NodeSizeCalculator';
import { getUserTypeColor, getNodeLabel } from './UserRelationGraph3D.utils';
import { buildGraphData, createLinkMaterial, createLinkWidth } from './UserRelationGraph3D.data';
import { useCommunityDetection } from './useCommunityDetection';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import { UserRelationGraph3DControls, type VisualizationState } from './UserRelationGraph3DControls';
import { CommunityInfoPopover } from './CommunityInfoPopover';

interface UserRelationGraph3DProps {
  network: UserRelationNetwork;
  className?: string;
  onNodeClick?: (node: UserRelationNode) => void;
  onNodeHover?: (node: UserRelationNode | null) => void;
  showDebugHud?: boolean;
  nodeSizeWeights?: NodeSizeWeights;
  linkDistanceConfig?: LinkDistanceConfig;
  enableNodeShapes?: boolean;
  enableNodeOpacity?: boolean;
  enableNodePulse?: boolean;
  enableCommunities?: boolean;
}

export const UserRelationGraph3D: React.FC<UserRelationGraph3DProps> = ({
  network,
  className = '',
  onNodeClick,
  onNodeHover,
  showDebugHud = false,
  nodeSizeWeights = DEFAULT_WEIGHTS,
  linkDistanceConfig: _linkDistanceConfig = DEFAULT_LINK_CONFIG,
  enableNodeShapes = true,
  enableNodeOpacity = true,
  enableNodePulse = false,
  enableCommunities = false,
}) => {
  const fgRef = useRef<ForceGraph3DHandle>(null);
  const [highlightNodes, _setHighlightNodes] = useState<Set<string>>(new Set());

  // 交互增强状态
  const [currentWeights, setCurrentWeights] = useState<NodeSizeWeights>(nodeSizeWeights);
  const [currentVisualization, setCurrentVisualization] = useState<VisualizationState>({
    enableNodeShapes,
    enableNodeOpacity,
    enableNodePulse,
    enableCommunities,
  });

  // 性能优化状态
  const [performanceConfig, setPerformanceConfig] = useState<PerformanceConfig>(DEFAULT_PERFORMANCE_CONFIG);
  const performanceConfigRef = useRef<PerformanceConfig>(performanceConfig);

  // 同步 performanceConfig 到 ref（避免在 useMemo 中使用 state）
  useEffect(() => {
    performanceConfigRef.current = performanceConfig;
  }, [performanceConfig]);

  // 社群检测
  const { communityMapping, interCommunityRelations } = useCommunityDetection(
    network,
    currentVisualization.enableCommunities
  );

  // 性能监控和自适应优化
  usePerformanceMonitor(showDebugHud, performanceConfigRef, setPerformanceConfig);

  const linkMaterial = useCallback(createLinkMaterial, []);
  const linkWidth = useCallback(createLinkWidth, []);

  const graphData = useMemo(
    () => buildGraphData(network, currentWeights, performanceConfigRef.current, showDebugHud),
    [network, currentWeights, showDebugHud] // 移除 performanceConfig 依赖，使用 ref
  );

  const { instancedMesh } = useInstancedNodeRenderer(graphData.nodes, {
    getNodeColor: (node: any) => {
      if (currentVisualization.enableCommunities && communityMapping) {
        const communityId = communityMapping.nodeToCommunity.get(node.id);
        if (communityId !== undefined) {
          const community = communityMapping.communities.find(c => c.id === communityId);
          if (community) return community.color;
        }
      }
      return getUserTypeColor(node.userType);
    },
    getNodeRadius: (node: any) => node.val || 5,
    highlightNodes,
  });

  const { pointsObject } = usePointsRenderer(graphData.backgroundNodes, {
    getNodeColor: () => '#888888',
    pointSize: 2,
    sizeAttenuation: true,
  });

  useEffect(() => {
    if (fgRef.current) {
      // 只在初始化时配置一次力导向参数
      fgRef.current.d3Force('charge').strength(-300);
      fgRef.current.d3Force('link').distance(120);

      // 初始化后自动调整视图
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(0, 50);
        }
      }, 100);
    }
  }, []); // 空依赖数组，只在挂载时执行一次

  // 添加点云到场景
  useEffect(() => {
    if (fgRef.current && pointsObject) {
      const scene = fgRef.current.scene();
      scene.add(pointsObject);
      return () => {
        scene.remove(pointsObject);
      };
    }
  }, [pointsObject]);

  // 添加 InstancedMesh 到场景
  useEffect(() => {
    if (fgRef.current && instancedMesh) {
      const scene = fgRef.current.scene();
      scene.add(instancedMesh);
      return () => {
        scene.remove(instancedMesh);
      };
    }
  }, [instancedMesh]);

  // 性能优化：简化点击效果，禁用相机动画和复杂聚焦计算
  const handleNodeClick = useCallback((node: any) => {
    if (onNodeClick) {
      onNodeClick(node as UserRelationNode);
    }

    // 性能优化：禁用聚焦算法和相机动画，减少计算和卡顿
  }, [onNodeClick]);

  // 性能优化：简化悬停效果，避免频繁计算邻居节点
  const handleNodeHover = useCallback((node: any) => {
    if (onNodeHover) {
      onNodeHover(node as UserRelationNode | null);
    }

    // 性能优化：禁用悬停高亮邻居节点，减少大数据量场景下的实时计算
    // 只保留点击高亮功能
  }, [onNodeHover]);

  return (
    <div className={`relative ${className}`}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeThreeObject={() => new THREE.Object3D()}
        nodeLabel={getNodeLabel}
        linkMaterial={linkMaterial}
        linkWidth={linkWidth}
        linkDirectionalParticles={0}
        linkCurvature={0.1}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        backgroundColor='rgba(0, 0, 0, 0)'
        showNavInfo={false}
        controlType="orbit"
        enableNodeDrag={true}
        enableNavigationControls={true}
        enablePointerInteraction={true}
        warmupTicks={50}
        cooldownTicks={100}
        cooldownTime={2000}
      />

      {/* 控制面板 */}
      <UserRelationGraph3DControls
        currentWeights={currentWeights}
        onWeightsChange={setCurrentWeights}
        currentVisualization={currentVisualization}
        onVisualizationChange={setCurrentVisualization}
      />

      {/* 社群信息面板 */}
      {currentVisualization.enableCommunities && communityMapping && (
        <CommunityInfoPopover
          communityMapping={communityMapping}
          interCommunityRelations={interCommunityRelations}
        />
      )}
    </div>
  );
};

export default UserRelationGraph3D;
