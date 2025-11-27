import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Info } from 'lucide-react';
import type {
  UserRelationNetwork,
  UserRelationNode,
} from '@sker/sdk';

import {
  ForceGraph3D,
  type ForceGraph3DHandle
} from '@sker/ui/components/ui/force-graph-3d';
import { useForceGraphNodeRenderer } from '@sker/ui/components/ui/use-force-graph-node-renderer';
import { useForceGraphLinkRenderer } from '@sker/ui/components/ui/use-force-graph-link-renderer';
import { getUserTypeColor, getEdgeColor } from './UserRelationGraph3D.utils';
import {
  GraphControlPanel,
  ControlGroup,
  SliderControl,
  SwitchControl,
} from '@sker/ui/components/ui/graph-control-panel';
import {
  GraphInfoPanel,
  InfoGrid,
  InfoItem,
  InfoList,
} from '@sker/ui/components/ui/graph-info-panel';
import { GraphFloatingButton } from '@sker/ui/components/ui/graph-floating-button';
import {
  PerformanceHud,
  getPerformanceLevel,
  getFpsColor,
} from '@sker/ui/components/ui/performance-hud';
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
import { smartFocusAlgorithm } from '@sker/ui/components/ui/graph-focus-system';
import {
  DEFAULT_PERFORMANCE_CONFIG,
  type PerformanceConfig,
  createSamplingStrategy,
  FrameRateMonitor,
  MemoryMonitor,
  getAdaptivePerformanceConfig
} from '@sker/ui/components/ui/graph-performance-optimizer';
import { LouvainCommunityDetector, analyzeInterCommunityRelations } from '@sker/ui/components/ui/graph-community-detector';
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

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes,
    getNodeShape: (node: any) => {
      if (!currentVisualization.enableNodeShapes) return 'sphere';
      const shapeMap: Record<string, 'sphere' | 'cube' | 'cylinder' | 'dodecahedron'> = {
        'official': 'cube',
        'media': 'cylinder',
        'kol': 'dodecahedron',
        'normal': 'sphere'
      };
      return shapeMap[node.userType] || 'sphere';
    },
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
    getNodeOpacity: (node: any) => {
      if (!currentVisualization.enableNodeOpacity) return 1.0;
      if (!node.lastActive) return 1.0;
      const daysSinceActive = Math.floor((Date.now() - new Date(node.lastActive).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceActive <= 1) return 1.0;
      if (daysSinceActive <= 7) return 0.8;
      if (daysSinceActive <= 30) return 0.6;
      return 0.3;
    },
    enablePulse: currentVisualization.enableNodePulse,
  });

  const {
    linkMaterial,
    linkWidth,
    linkDirectionalParticles,
    linkDirectionalParticleWidth,
    linkDirectionalParticleSpeed,
  } = useForceGraphLinkRenderer({
    getLinkColor: (link: any) => getEdgeColor(link.type),
  });

  const graphData = useMemo(() => {
    // 应用性能优化采样
    let processedNodes = network.nodes;
    let processedEdges = network.edges;

    if (performanceConfig.enableSampling) {
      const sampled = createSamplingStrategy(
        network.nodes,
        network.edges,
        performanceConfig,
        (a, b) => (b.influence || 0) - (a.influence || 0)
      );
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

      const bounds = 500;
      fgRef.current.cameraPosition({
        x: bounds * 0.7,
        y: bounds * 0.5,
        z: bounds
      }, { x: 0, y: 0, z: 0 }, 0);
    }
  }, [network.edges, network.nodes, currentLinkConfig]);

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

    if (fpsUpdateIntervalRef.current) {
      clearInterval(fpsUpdateIntervalRef.current);
    }

    fpsUpdateIntervalRef.current = setInterval(() => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;

      if (deltaTime > 0 && frameCountRef.current > 0) {
        const avgFrameTime = deltaTime / frameCountRef.current;
        const currentFps = Math.round(1000 / avgFrameTime);

        setFps(currentFps);
        setFrameTime(parseFloat(avgFrameTime.toFixed(2)));
      }

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

      {/* 控制面板 */}
      <GraphControlPanel title="可视化设置" position="top-right">
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

        <ControlGroup
          title="连线设置"
          onReset={() => setCurrentLinkConfig(DEFAULT_LINK_CONFIG)}
        >
          <SwitchControl
            label="动态连线长度"
            checked={currentLinkConfig.useDynamicDistance}
            onCheckedChange={(checked) =>
              setCurrentLinkConfig({ ...currentLinkConfig, useDynamicDistance: checked })
            }
          />
          {currentLinkConfig.useDynamicDistance && (
            <>
              <SliderControl
                label="最小距离"
                value={currentLinkConfig.minDistance}
                min={20}
                max={100}
                onValueChange={(v) =>
                  setCurrentLinkConfig({ ...currentLinkConfig, minDistance: v })
                }
              />
              <SliderControl
                label="最大距离"
                value={currentLinkConfig.maxDistance}
                min={100}
                max={300}
                onValueChange={(v) =>
                  setCurrentLinkConfig({ ...currentLinkConfig, maxDistance: v })
                }
              />
            </>
          )}
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

      {/* 性能监控 */}
      <PerformanceHud
        visible={showDebugHud}
        title="性能监控"
        level={getPerformanceLevel(fps)}
        position="top-left"
        metrics={[
          { label: 'FPS', value: fps, color: getFpsColor(fps) },
          { label: '帧时间', value: frameTime, suffix: 'ms' },
          {
            label: '节点',
            value: sampledData
              ? `${graphData.nodes.length} (${((graphData.nodes.length / network.nodes.length) * 100).toFixed(1)}%)`
              : graphData.nodes.length,
          },
          {
            label: '边',
            value: sampledData
              ? `${graphData.links.length} (${((graphData.links.length / network.edges.length) * 100).toFixed(1)}%)`
              : graphData.links.length,
          },
        ]}
      />

      {/* 社群信息面板 */}
      {currentVisualization.enableCommunities && communityMapping && (
        <>
          <GraphFloatingButton
            position="bottom-left"
            onClick={() => setShowCommunityInfo(!showCommunityInfo)}
            title="显示社群信息"
          >
            <Info className="size-4" />
          </GraphFloatingButton>

          <GraphInfoPanel
            title="社群分析"
            open={showCommunityInfo}
            onClose={() => setShowCommunityInfo(false)}
            position="bottom-left"
            className="ml-14"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                共检测到 <span className="font-semibold text-primary">{communityMapping.communities.length}</span> 个社群
              </p>

              <InfoGrid columns={2}>
                <InfoItem
                  label="最大社群"
                  value={`${communityMapping.communities[0]?.size || 0} 节点`}
                  variant="accent"
                />
                <InfoItem
                  label="平均密度"
                  value={`${((communityMapping.communities.reduce((sum, c) => sum + c.density, 0) / communityMapping.communities.length) * 100).toFixed(1)}%`}
                  variant="accent"
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
                  maxItems={5}
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
          </GraphInfoPanel>
        </>
      )}
    </div>
  );
};

export default UserRelationGraph3D;
