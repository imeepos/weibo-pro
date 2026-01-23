import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import type { UserRelationNetwork, UserRelationNode } from '@sker/sdk';
import { ForceGraph3D, type ForceGraph3DHandle } from '@sker/ui/components/ui/force-graph-3d';
import { useCommunityDetectorWorker } from '@/hooks/useCommunityDetectorWorker';
import { useGraphStatistics } from '@/hooks/useGraphStatistics';
import { useTheme } from '@/hooks/useTheme';
import { useChartTheme } from '@/hooks/useChartConfig';
import { GraphStatisticsPanel } from './GraphStatisticsPanel';
import * as d3Force from 'd3-force-3d';
import { Subject } from 'rxjs';

interface UserRelationGraph3DOffscreenProps {
  network: UserRelationNetwork;
  className?: string;
  onNodeClick?: (node: UserRelationNode) => void;
  onNodeHover?: (node: UserRelationNode) => void;
  edgeThreshold?: number;
}

export const UserRelationGraph3DOffscreen: React.FC<UserRelationGraph3DOffscreenProps> = ({
  network,
  className = '',
  onNodeClick,
  onNodeHover,
}) => {
  const { isDark } = useTheme();
  const chartTheme = useChartTheme();
  const graphRef = useRef<ForceGraph3DHandle>(null);
  const { detect, isDetecting, graphData } = useCommunityDetectorWorker();
  const [isSimulating, setIsSimulating] = useState(false);

  // 计算统计数据
  const { communityStats, topUsers, locationStats } = useGraphStatistics(graphData, network.nodes);

  const graphDataReady$ = useRef(new Subject<boolean>());
  const engineStopped$ = useRef(new Subject<boolean>());

  const networkKey = useMemo(
    () => `${network.nodes.length}-${network.edges.length}`,
    [network.nodes.length, network.edges.length]
  );

  useEffect(() => {
    if (network.nodes.length > 0 && network.edges.length > 0) {
      detect(network.nodes, network.edges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkKey]);

  useEffect(() => {
    if (graphData && graphData.nodes.length > 0) {
      graphDataReady$.current.next(true);
      setIsSimulating(true);

      // 立即配置力导向参数
      if (graphRef.current) {
        graphRef.current.d3Force('radial', d3Force.forceRadial(600, 0, 0, 0).strength(0.3));
        graphRef.current.d3Force('charge', d3Force.forceManyBody().strength(-150));

        const linkForce = graphRef.current.d3Force('link');
        if (linkForce) {
          linkForce.distance(30).strength(0.1);
        }
      }
    }
  }, [graphData]);

  const handleEngineStop = () => {
    engineStopped$.current.next(true);
    setIsSimulating(false);
  };

  // 生成微博个人主页 URL
  const getWeiboUrl = useCallback((node: UserRelationNode) => {
    return `https://weibo.com/${node.id}?refer_flag=1001030103_`;
  }, []);

  // 生成节点悬停提示信息
  const getNodeLabel = useCallback((node: any) => {
    const userRelationNode = node as UserRelationNode;
    const verifiedBadge = userRelationNode.verified ? ' ✓' : '';
    const userTypeMap: Record<string, string> = {
      official: '官方',
      media: '媒体',
      kol: 'KOL',
      normal: '普通用户'
    };

    // 使用主题感知的颜色
    const { tooltipStyle, axisStyle, seriesColors } = chartTheme;
    const highlightColor = seriesColors.total;
    const secondaryTextColor = axisStyle.labelColor;
    const primaryTextColor = tooltipStyle.textColor;
    const borderColor = tooltipStyle.borderColor;

    // 安全获取用户类型显示名称
    const userTypeName = userRelationNode.userType ? (userTypeMap[userRelationNode.userType] || '用户') : '用户';
    const locationText = userRelationNode.location ? `· ${userRelationNode.location}` : '';
    const userInfoLine = [userTypeName, locationText].filter(Boolean).join(' ');

    return `
      <div style="padding: 14px 16px; min-width: 220px; max-width: 280px;">
        <div style="font-size: 15px; font-weight: 600; margin-bottom: 6px; color: ${highlightColor}; display: flex; align-items: center; gap: 4px;">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${userRelationNode.name || '未知用户'}</span>
          ${verifiedBadge ? `<span style="color: #3b82f6; font-size: 12px;">${verifiedBadge}</span>` : ''}
        </div>
        ${userInfoLine ? `<div style="font-size: 12px; color: ${secondaryTextColor}; margin-bottom: 10px;">${userInfoLine}</div>` : ''}
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 13px;">
          ${userRelationNode.followers != null ? `
            <span style="color: ${secondaryTextColor};">粉丝</span>
            <span style="color: ${primaryTextColor}; font-weight: 500; text-align: right;">${userRelationNode.followers.toLocaleString()}</span>
          ` : ''}
          ${userRelationNode.postCount != null ? `
            <span style="color: ${secondaryTextColor};">发帖</span>
            <span style="color: ${primaryTextColor}; font-weight: 500; text-align: right;">${userRelationNode.postCount.toLocaleString()}</span>
          ` : ''}
          ${userRelationNode.influence != null ? `
            <span style="color: ${secondaryTextColor};">影响力</span>
            <span style="color: ${primaryTextColor}; font-weight: 500; text-align: right;">${userRelationNode.influence.toFixed(2)}</span>
          ` : ''}
        </div>
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid ${borderColor}; font-size: 11px; color: ${secondaryTextColor}; text-align: center;">
          点击跳转到微博主页 →
        </div>
      </div>
    `;
  }, [chartTheme]);

  // 处理节点点击 - 跳转到微博主页
  const handleNodeClick = useCallback((node: any) => {
    const userRelationNode = node as UserRelationNode;
    const weiboUrl = getWeiboUrl(userRelationNode);
    window.open(weiboUrl, '_blank');
    onNodeClick?.(userRelationNode);
  }, [getWeiboUrl, onNodeClick]);

  // 处理统计面板中用户点击
  const handleStatUserClick = useCallback((user: { id: string }) => {
    const weiboUrl = `https://weibo.com/${user.id}?refer_flag=1001030103_`;
    window.open(weiboUrl, '_blank');
  }, []);

  return (
    <div className={`relative ${className}`}>
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData || { nodes: [], links: [] }}
        backgroundColor={isDark ? 'rgba(10, 10, 15, 1)' : 'rgba(249, 250, 251, 1)'}
        nodeLabel={getNodeLabel}
        nodeAutoColorBy="color"
        nodeOpacity={0.9}
        linkOpacity={isDark ? 0.3 : 0.2}
        linkWidth={(link: any) => Math.min(3, Math.max(0.5, (link.value || 1) * 0.1))}
        onNodeClick={handleNodeClick}
        onNodeHover={(node: any) => onNodeHover?.(node as any)}
        onEngineStop={handleEngineStop}
        enableNodeDrag={true}
        enableNavigationControls={true}
        warmupTicks={50}
        cooldownTicks={100}
      />

      {(isDetecting || isSimulating) && (
        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm text-foreground px-3 py-2 text-xs rounded-lg shadow-lg border border-border">
          <div className="flex items-center gap-2">
            <div className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>{isDetecting ? '加载中...' : '计算布局中...'}</span>
          </div>
        </div>
      )}

      {/* 统计信息面板 */}
      {!isDetecting && !isSimulating && graphData && graphData.nodes.length > 0 && (
        <GraphStatisticsPanel
          communityStats={communityStats}
          topUsers={topUsers}
          locationStats={locationStats}
          onUserClick={handleStatUserClick}
        />
      )}
    </div>
  );
};

export default UserRelationGraph3DOffscreen;
