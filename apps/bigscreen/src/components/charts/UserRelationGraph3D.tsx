import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type {
  UserRelationNetwork,
  UserRelationNode,
} from '@sker/sdk';

import { useNodeRenderer } from './NodeRenderer';
import { useLinkRenderer } from './LinkRenderer';
import { PerformanceMonitor } from './PerformanceMonitor';
import { getNodeLabel } from './UserRelationGraph3D.utils';
import {
  calculateCompositeScore,
  calculateNodeSize,
  calculateConnectionCounts,
  DEFAULT_WEIGHTS,
  type NodeSizeWeights
} from './NodeSizeCalculator';
import {
  calculateAllLinkDistances,
  DEFAULT_LINK_CONFIG,
  type LinkDistanceConfig
} from './LinkDistanceCalculator';
import { smartFocusAlgorithm } from './SmartFocusSystem';
import { EnhancedControls } from './EnhancedControls';
import {
  DEFAULT_PERFORMANCE_CONFIG,
  type PerformanceConfig,
  createSamplingStrategy,
  FrameRateMonitor,
  MemoryMonitor,
  getAdaptivePerformanceConfig
} from './PerformanceOptimizer';
import { LouvainCommunityDetector, analyzeInterCommunityRelations } from './CommunityDetector';
import type { CommunityMapping } from './NodeShapeUtils';
import { CommunityInfoPanel } from './CommunityInfoPanel';

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
  linkDistanceConfig = DEFAULT_LINK_CONFIG,
  enableNodeShapes = true,
  enableNodeOpacity = true,
  enableNodePulse = false,
  enableCommunities = false,
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

  // 交互增强状态
  const [currentWeights, setCurrentWeights] = useState<NodeSizeWeights>(nodeSizeWeights);
  const [currentLinkConfig, setCurrentLinkConfig] = useState<LinkDistanceConfig>(linkDistanceConfig);
  const [currentVisualization, setCurrentVisualization] = useState({
    enableNodeShapes,
    enableNodeOpacity,
    enableNodePulse,
    enableCommunities
  });
  const [dimmedNodes, setDimmedNodes] = useState<Set<string>>(new Set());

  // 性能优化状态
  const [performanceConfig, setPerformanceConfig] = useState<PerformanceConfig>(DEFAULT_PERFORMANCE_CONFIG);
  const frameRateMonitorRef = useRef(new FrameRateMonitor());
  const memoryMonitorRef = useRef(new MemoryMonitor());
  const [sampledData, setSampledData] = useState<{ nodes: any[]; edges: any[] } | null>(null);

  // 社群检测状态
  const [communityMapping, setCommunityMapping] = useState<CommunityMapping | null>(null);
  const [interCommunityRelations, setInterCommunityRelations] = useState<any[]>([]);
  const [showCommunityInfo, setShowCommunityInfo] = useState(false);

  const { nodeThreeObject } = useNodeRenderer({
    highlightNodes,
    enableShapes: currentVisualization.enableNodeShapes,
    enableOpacity: currentVisualization.enableNodeOpacity,
    enablePulse: currentVisualization.enableNodePulse,
    enableCommunities: currentVisualization.enableCommunities,
    edges: network.edges,
    communityMapping
  });
  const {
    linkMaterial,
    linkWidth,
    linkDirectionalParticles,
    linkDirectionalParticleWidth,
    linkDirectionalParticleSpeed,
  } = useLinkRenderer();

  const graphData = useMemo(() => {
    // 应用性能优化采样
    let processedNodes = network.nodes;
    let processedEdges = network.edges;

    if (performanceConfig.enableSampling) {
      const sampled = createSamplingStrategy(network.nodes, network.edges, performanceConfig);
      processedNodes = sampled.nodes;
      processedEdges = sampled.edges;
      setSampledData({ nodes: processedNodes, edges: processedEdges });
    } else {
      setSampledData(null);
    }

    // 计算每个节点的连接数
    const connectionCountMap = calculateConnectionCounts(processedEdges);

    return {
      nodes: processedNodes.map(node => {
        const connectionCount = connectionCountMap.get(node.id.toString()) || 0;
        const compositeScore = calculateCompositeScore(node, connectionCount, currentWeights);
        const nodeSize = calculateNodeSize(compositeScore);

        return {
          ...node,
          connectionCount,
          compositeScore,
          val: nodeSize,
        };
      }),
      links: processedEdges.map(edge => ({
        source: edge.source,
        target: edge.target,
        value: edge.weight,
        type: edge.type,
      })),
    };
  }, [network, currentWeights, performanceConfig]);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-200);

      // 使用动态连线长度
      if (currentLinkConfig.useDynamicDistance) {
        const linkDistances = calculateAllLinkDistances(
          network.edges,
          network.nodes,
          currentLinkConfig
        );

        fgRef.current.d3Force('link').distance((link: any) => {
          const linkId = `${link.source}-${link.target}`;
          return linkDistances.get(linkId) || 100;
        });
      } else {
        fgRef.current.d3Force('link').distance(100);
      }

      // 设置初始相机位置，让关系图居中展示
      const bounds = 500; // 根据图的范围估算
      fgRef.current.cameraPosition({
        x: bounds * 0.7,
        y: bounds * 0.5,
        z: bounds
      }, { x: 0, y: 0, z: 0 }, 0); // 看向中心点
    }
  }, [network.edges, network.nodes, currentLinkConfig]);

  // 性能监控和自适应优化
  useEffect(() => {
    if (!showDebugHud) return;

    const monitorInterval = setInterval(() => {
      // 记录帧率
      frameRateMonitorRef.current.recordFrame();

      // 记录内存使用
      memoryMonitorRef.current.recordMemoryUsage();

      // 自适应性能调整
      const currentFPS = frameRateMonitorRef.current.getFPS();
      const memoryStats = memoryMonitorRef.current.getMemoryStats();
      const memoryUsageMB = memoryStats ? memoryStats.current / (1024 * 1024) : 0;

      if (currentFPS < 25 || memoryUsageMB > 400) {
        const newConfig = getAdaptivePerformanceConfig(performanceConfig, currentFPS, memoryUsageMB);
        setPerformanceConfig(newConfig);
      }
    }, 1000);

    return () => {
      clearInterval(monitorInterval);
    };
  }, [showDebugHud, performanceConfig]);

  // 社群检测
  useEffect(() => {
    if (currentVisualization.enableCommunities && network.nodes.length > 0 && network.edges.length > 0) {
      // 使用 Web Worker 或 setTimeout 避免阻塞主线程
      setTimeout(() => {
        try {
          const detector = new LouvainCommunityDetector(network.nodes, network.edges);
          const communities = detector.detectCommunities();

          // 构建社群映射
          const nodeToCommunity = new Map<string, number>();
          for (const community of communities) {
            for (const nodeId of community.nodes) {
              nodeToCommunity.set(nodeId, community.id);
            }
          }

          const mapping: CommunityMapping = {
            nodeToCommunity,
            communities
          };

          setCommunityMapping(mapping);

          // 分析社群间关系
          const relations = analyzeInterCommunityRelations(communities, network.edges);
          setInterCommunityRelations(relations);

          console.log(`检测到 ${communities.length} 个社群，最大社群包含 ${communities[0]?.size || 0} 个节点`);
        } catch (error) {
          console.warn('社群检测失败:', error);
        }
      }, 0);
    } else {
      setCommunityMapping(null);
      setInterCommunityRelations([]);
    }
  }, [network.nodes, network.edges, currentVisualization.enableCommunities]);

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

    // 应用智能聚焦
    const focusResult = smartFocusAlgorithm(node, graphData);
    setHighlightNodes(focusResult.highlightNodes);
    setDimmedNodes(focusResult.dimmedNodes);

    if (fgRef.current) {
      fgRef.current.cameraPosition(
        focusResult.cameraPosition,
        focusResult.cameraTarget,
        2000
      );
    }
  }, [onNodeClick, graphData]);

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

      {/* 增强控制面板 */}
      <EnhancedControls
        nodeSizeWeights={currentWeights}
        linkDistanceConfig={currentLinkConfig}
        enableNodeShapes={currentVisualization.enableNodeShapes}
        enableNodeOpacity={currentVisualization.enableNodeOpacity}
        enableNodePulse={currentVisualization.enableNodePulse}
        enableCommunities={currentVisualization.enableCommunities}
        onWeightsChange={setCurrentWeights}
        onLinkConfigChange={setCurrentLinkConfig}
        onVisualizationChange={setCurrentVisualization}
      />

      <PerformanceMonitor
        showDebugHud={showDebugHud}
        fps={fps}
        frameTime={frameTime}
        nodesCount={graphData.nodes.length}
        linksCount={graphData.links.length}
        originalNodesCount={network.nodes.length}
        originalLinksCount={network.edges.length}
        performanceLevel={frameRateMonitorRef.current.getPerformanceLevel()}
      />

      {/* 社群信息面板 */}
      {currentVisualization.enableCommunities && communityMapping && (
        <CommunityInfoPanel
          communities={communityMapping.communities}
          interCommunityRelations={interCommunityRelations}
          isOpen={showCommunityInfo}
          onClose={() => setShowCommunityInfo(false)}
        />
      )}

      {/* 社群信息开关 */}
      {currentVisualization.enableCommunities && communityMapping && (
        <button
          onClick={() => setShowCommunityInfo(!showCommunityInfo)}
          className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-gray-200 hover:bg-white transition-colors"
          title="显示社群信息"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default UserRelationGraph3D;