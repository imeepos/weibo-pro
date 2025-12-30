import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Info } from 'lucide-react';
import * as THREE from 'three';
import type {
  UserRelationNetwork,
  UserRelationNode,
} from '@sker/sdk';

import {
  ForceGraph3D,
  type ForceGraph3DHandle
} from '@sker/ui/components/ui/force-graph-3d';
import { useInstancedNodeRenderer } from '@sker/ui/components/ui/use-instanced-node-renderer';
import { usePointsRenderer } from '@sker/ui/components/ui/use-points-renderer';
import { useForceGraphLinkRenderer } from '@sker/ui/components/ui/use-force-graph-link-renderer';
import { getUserTypeColor, getEdgeColor, getEdgeOpacity } from './UserRelationGraph3D.utils';
import {
  GraphControlPanel,
  ControlGroup,
  SliderControl,
  SwitchControl,
} from '@sker/ui/components/ui/graph-control-panel';
import {
  InfoGrid,
  InfoItem,
  InfoList,
} from '@sker/ui/components/ui/graph-info-panel';
import { GraphFloatingButton } from '@sker/ui/components/ui/graph-floating-button';
import { Popover, PopoverTrigger, PopoverContent } from '@sker/ui/components/ui/popover';
import {
  calculateCompositeScore,
  calculateNodeSize,
  calculateConnectionCounts,
  DEFAULT_WEIGHTS,
  type NodeSizeWeights
} from './NodeSizeCalculator';
import {
  DEFAULT_LINK_CONFIG,
  type LinkDistanceConfig
} from './LinkDistanceCalculator';
import {
  DEFAULT_PERFORMANCE_CONFIG,
  type PerformanceConfig,
  createSamplingStrategy,
  FrameRateMonitor,
  MemoryMonitor,
  getAdaptivePerformanceConfig
} from '@sker/ui/lib/graph-performance-optimizer';
import { LouvainCommunityDetector, analyzeInterCommunityRelations } from '@sker/ui/lib/graph-community-detector';
import { getRenderData, LAYER_THRESHOLDS } from './LayeredRenderer';
import type { CommunityMapping } from './NodeShapeUtils';

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
  const fgRef = useRef<ForceGraph3DHandle>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());

  // 交互增强状态
  const [currentWeights, setCurrentWeights] = useState<NodeSizeWeights>(nodeSizeWeights);
  const [currentVisualization, setCurrentVisualization] = useState({
    enableNodeShapes,
    enableNodeOpacity,
    enableNodePulse,
    enableCommunities
  });

  // 性能优化状态
  const [performanceConfig, setPerformanceConfig] = useState<PerformanceConfig>(DEFAULT_PERFORMANCE_CONFIG);
  const frameRateMonitorRef = useRef(new FrameRateMonitor());
  const memoryMonitorRef = useRef(new MemoryMonitor());

  // 社群检测状态
  const [communityMapping, setCommunityMapping] = useState<CommunityMapping | null>(null);
  const [interCommunityRelations, setInterCommunityRelations] = useState<any[]>([]);

  const { nodeThreeObject } = useInstancedNodeRenderer(graphData.nodes, {
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
  });

  const { pointsObject } = usePointsRenderer(graphData.backgroundNodes, {
    getNodeColor: () => '#888888',
    pointSize: 2,
    sizeAttenuation: true,
  });

  const {
  } = useForceGraphLinkRenderer({
    getLinkColor: (link: any) => getEdgeColor(link.type),
  });

  const linkMaterial = useCallback((link: any) => {
    const weight = link.value || 1;
    const opacity = getEdgeOpacity(weight);
    const color = getEdgeColor(link.type);
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
    });
  }, []);

  const linkWidth = useCallback((link: any) => {
    const weight = link.value || 1;
    const normalizedWeight = Math.min(weight / 100, 1);
    return 0.5 + normalizedWeight * 3;
  }, []);

  const graphData = useMemo(() => {
    let processedNodes = network.nodes;
    let processedEdges = network.edges;

    // 计算连接数和综合得分
    const connectionCountMap = calculateConnectionCounts(processedEdges);
    const nodesWithScores = processedNodes.map(node => {
      const connectionCount = connectionCountMap.get(node.id.toString()) || 0;
      const compositeScore = calculateCompositeScore(node, connectionCount, currentWeights);
      const nodeSize = calculateNodeSize(compositeScore);

      return {
        ...node,
        connectionCount,
        compositeScore,
        val: nodeSize,
      };
    });

    // 应用分层渲染策略
    const renderData = getRenderData(nodesWithScores, processedEdges, 'compositeScore');

    // 应用性能优化采样（仅在分层后仍然节点过多时）
    if (performanceConfig.enableSampling && renderData.nodes.length > LAYER_THRESHOLDS.CORE) {
      const sampled = createSamplingStrategy(
        renderData.nodes,
        renderData.edges,
        performanceConfig,
        (a, b) => (b.compositeScore || 0) - (a.compositeScore || 0)
      );
      return {
        nodes: sampled.nodes,
        links: sampled.edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          value: edge.weight,
          type: edge.type,
        })),
        backgroundNodes: renderData.backgroundNodes || [],
      };
    }

    return {
      nodes: renderData.nodes,
      links: renderData.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        value: edge.weight,
        type: edge.type,
      })),
      backgroundNodes: renderData.backgroundNodes || [],
    };
  }, [network, currentWeights, performanceConfig]);

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

  // 性能监控和自适应优化
  useEffect(() => {
    if (!showDebugHud) return;

    const monitorInterval = setInterval(() => {
      frameRateMonitorRef.current.recordFrame();
      memoryMonitorRef.current.recordMemoryUsage();

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
      setTimeout(() => {
        try {
          const detector = new LouvainCommunityDetector(network.nodes, network.edges);
          const communities = detector.detectCommunities();

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

          const relations = analyzeInterCommunityRelations(communities, network.edges);
          setInterCommunityRelations(relations);

        } catch (error) {
          console.warn('社群检测失败:', error);
        }
      }, 0);
    } else {
      setCommunityMapping(null);
      setInterCommunityRelations([]);
    }
  }, [network.nodes, network.edges, currentVisualization.enableCommunities]);

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
        nodeLabel={(node: any) => {
          const formatNumber = (num: number): string => {
            if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
            if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
            return num.toString();
          };
          const getUserTypeLabel = (userType: string): string => {
            const labels: Record<string, string> = {
              'official': '官方账号',
              'media': '媒体账号',
              'kol': 'KOL账号',
              'normal': '普通用户'
            };
            return labels[userType] || '未知';
          };
          return `
            <div style="background: rgba(0,0,0,0.9); color: white; padding: 12px; border-radius: 8px; font-size: 14px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">${node.name}</div>
              <div>类型: ${getUserTypeLabel(node.userType)}</div>
              <div>粉丝: ${formatNumber(node.followers)}</div>
              <div>发帖: ${formatNumber(node.postCount)}</div>
              <div>影响力: ${node.influence}/100</div>
              ${node.verified ? '<div style="color: #2196f3;">✓ 已认证</div>' : ''}
            </div>
          `;
        }}
        nodeThreeObject={nodeThreeObject}
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
        warmupTicks={100}
        cooldownTicks={200}
        cooldownTime={3000}
      />

      {/* 控制面板 */}
      <GraphControlPanel title="可视化设置" position="bottom-right">
        <ControlGroup
          title="节点大小权重"
          onReset={() => setCurrentWeights(DEFAULT_WEIGHTS)}
        >
          {Object.entries(currentWeights).map(([key, value]) => (
            <SliderControl
              key={key}
              label={
                key === 'followers' ? '粉丝数' :
                  key === 'influence' ? '影响力' :
                    key === 'postCount' ? '发帖数' : '连接数'
              }
              value={Math.round(value * 100)}
              min={0}
              max={100}
              suffix="%"
              onValueChange={(v) => setCurrentWeights({ ...currentWeights, [key]: v / 100 })}
            />
          ))}
        </ControlGroup>

        <ControlGroup title="可视化效果">
          {[
            { key: 'enableNodeShapes', label: '节点形状编码' },
            { key: 'enableNodeOpacity', label: '活跃度透明度' },
            { key: 'enableNodePulse', label: '脉动动画' },
            { key: 'enableCommunities', label: '社群颜色' }
          ].map(({ key, label }) => (
            <SwitchControl
              key={key}
              label={label}
              checked={currentVisualization[key as keyof typeof currentVisualization]}
              onCheckedChange={(checked) =>
                setCurrentVisualization({ ...currentVisualization, [key]: checked })
              }
            />
          ))}
        </ControlGroup>
      </GraphControlPanel>

      {/* 社群信息面板 */}
      {currentVisualization.enableCommunities && communityMapping && (
        <Popover>
          <PopoverTrigger asChild>
            <GraphFloatingButton
              position="bottom-left"
              title="显示社群信息"
            >
              <Info className="size-4" />
            </GraphFloatingButton>
          </PopoverTrigger>

          <PopoverContent className="w-96 max-h-[600px] overflow-y-auto" align="start" side="right" sideOffset={8}>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base mb-2">社群分析</h3>
                <p className="text-sm text-muted-foreground">
                  共检测到 <span className="font-semibold text-primary">{communityMapping.communities.length}</span> 个社群
                </p>
              </div>

              <InfoGrid columns={2}>
                <InfoItem
                  label="最大社群"
                  value={`${communityMapping.communities[0]?.size || 0} 节点`}
                  variant="default"
                />
                <InfoItem
                  label="平均密度"
                  value={`${((communityMapping.communities.reduce((sum, c) => sum + c.density, 0) / communityMapping.communities.length) * 100).toFixed(1)}%`}
                  variant="default"
                />
              </InfoGrid>

              <div>
                <h4 className="text-sm font-medium mb-2">社群详情</h4>
                <InfoList
                  items={communityMapping.communities.map(c => ({
                    id: c.id,
                    color: c.color,
                    label: `社群 ${c.id}`,
                    value: `${c.size} 节点`,
                  }))}
                  maxItems={10}
                />
              </div>

              {interCommunityRelations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">社群间连接</h4>
                  <div className="space-y-1 text-xs">
                    {interCommunityRelations.slice(0, 3).map((relation, index) => (
                      <div key={index} className="flex justify-between items-center p-1.5 bg-muted rounded">
                        <span className="text-muted-foreground">
                          社群 {relation.sourceCommunity} ↔ 社群 {relation.targetCommunity}
                        </span>
                        <span className="font-medium">
                          {relation.edgeCount} 连接
                        </span>
                      </div>
                    ))}
                    {interCommunityRelations.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        还有 {interCommunityRelations.length - 3} 个关系...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default UserRelationGraph3D;
