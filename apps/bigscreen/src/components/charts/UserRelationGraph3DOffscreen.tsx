import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import type { UserRelationNetwork, UserRelationNode } from '@sker/sdk';
import { ForceGraph3D, type ForceGraph3DHandle } from '@sker/ui/components/ui/force-graph-3d';
import { useCommunityDetectorWorker } from '@/hooks/useCommunityDetectorWorker';
import { useGraphStatistics } from '@/hooks/useGraphStatistics';
import { useTheme } from '@/hooks/useTheme';
import { useChartTheme } from '@/hooks/useChartConfig';
import { GraphStatisticsPanel } from './GraphStatisticsPanel';
import { sanitizeUserRelationNetwork } from './UserRelationGraph3D.sanitize';
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
  edgeThreshold = 100,
}) => {
  const { isDark } = useTheme();
  const chartTheme = useChartTheme();
  const graphRef = useRef<ForceGraph3DHandle>(null);
  const { detect, isDetecting, graphData } = useCommunityDetectorWorker();
  const [isSimulating, setIsSimulating] = useState(false);

  // 计算统计数据
  const visibleNetwork = useMemo(
    () => sanitizeUserRelationNetwork(network, edgeThreshold),
    [network, edgeThreshold]
  );

  const { communityStats, topUsers, locationStats } = useGraphStatistics(
    graphData,
    visibleNetwork.nodes
  );

  const graphDataReady$ = useRef(new Subject<boolean>());
  const engineStopped$ = useRef(new Subject<boolean>());

  const networkKey = useMemo(
    () => `${visibleNetwork.nodes.length}-${visibleNetwork.edges.length}`,
    [visibleNetwork.nodes.length, visibleNetwork.edges.length]
  );

  useEffect(() => {
    if (visibleNetwork.nodes.length > 0 && visibleNetwork.edges.length > 0) {
      detect(visibleNetwork.nodes, visibleNetwork.edges);
    }
     
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

  // 格式化数字显示
  const formatNumber = useCallback((num: number | null | undefined): string => {
    if (num == null) return '-';
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
  }, []);

  // 生成节点悬停提示信息
  const getNodeLabel = useCallback((node: any) => {
    const userRelationNode = node as UserRelationNode;
    const userTypeMap: Record<string, string> = {
      official: '官方认证',
      media: '媒体账号',
      kol: 'KOL大V',
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

    // 获取节点的连接数（degree）
    const nodeLinks = graphData?.links?.filter(
      (link: any) => link.source?.id === node.id || link.target?.id === node.id ||
                     link.source === node.id || link.target === node.id
    ) || [];
    const degree = nodeLinks.length;

    // 计算总互动权重
    const totalWeight = nodeLinks.reduce((sum: number, link: any) => sum + (link.value || link.weight || 1), 0);

    // 认证标识
    const verifiedHtml = userRelationNode.verified
      ? `<span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; background: #3b82f6; border-radius: 50%; margin-left: 4px;">
           <span style="color: white; font-size: 10px; font-weight: bold;">✓</span>
         </span>`
      : '';

    // 用户类型标签颜色
    const typeColors: Record<string, string> = {
      official: '#f59e0b',
      media: '#8b5cf6',
      kol: '#ec4899',
      normal: '#6b7280'
    };
    const typeColor = typeColors[userRelationNode.userType] || '#6b7280';

    return `
      <div style="padding: 16px; min-width: 260px; max-width: 320px;">
        <!-- 头部：用户名和认证 -->
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 16px; font-weight: 600; color: ${highlightColor}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">
            ${userRelationNode.name || '未知用户'}
          </span>
          ${verifiedHtml}
        </div>

        <!-- 用户类型和地区标签 -->
        <div style="display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">
          <span style="display: inline-block; padding: 2px 8px; background: ${typeColor}20; color: ${typeColor}; border-radius: 4px; font-size: 11px; font-weight: 500;">
            ${userTypeName}
          </span>
          ${userRelationNode.location ? `
            <span style="display: inline-block; padding: 2px 8px; background: ${secondaryTextColor}15; color: ${secondaryTextColor}; border-radius: 4px; font-size: 11px;">
              📍 ${userRelationNode.location}
            </span>
          ` : ''}
        </div>

        <!-- 核心数据 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <div style="background: ${secondaryTextColor}08; padding: 8px 10px; border-radius: 6px;">
            <div style="font-size: 10px; color: ${secondaryTextColor}; margin-bottom: 2px;">粉丝数</div>
            <div style="font-size: 14px; font-weight: 600; color: ${primaryTextColor};">${formatNumber(userRelationNode.followers)}</div>
          </div>
          <div style="background: ${secondaryTextColor}08; padding: 8px 10px; border-radius: 6px;">
            <div style="font-size: 10px; color: ${secondaryTextColor}; margin-bottom: 2px;">发帖数</div>
            <div style="font-size: 14px; font-weight: 600; color: ${primaryTextColor};">${formatNumber(userRelationNode.postCount)}</div>
          </div>
        </div>

        <!-- 影响力和网络数据 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <div style="background: ${highlightColor}10; padding: 8px 10px; border-radius: 6px; border-left: 3px solid ${highlightColor};">
            <div style="font-size: 10px; color: ${secondaryTextColor}; margin-bottom: 2px;">影响力指数</div>
            <div style="font-size: 14px; font-weight: 600; color: ${highlightColor};">
              ${userRelationNode.influence != null ? userRelationNode.influence.toFixed(2) : '-'}
            </div>
          </div>
          <div style="background: #10b98110; padding: 8px 10px; border-radius: 6px; border-left: 3px solid #10b981;">
            <div style="font-size: 10px; color: ${secondaryTextColor}; margin-bottom: 2px;">网络连接</div>
            <div style="font-size: 14px; font-weight: 600; color: #10b981;">${degree} 人</div>
          </div>
        </div>

        <!-- 互动权重 -->
        ${totalWeight > 0 ? `
          <div style="background: ${secondaryTextColor}05; padding: 8px 10px; border-radius: 6px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: ${secondaryTextColor};">互动强度</span>
              <span style="font-size: 12px; font-weight: 500; color: ${primaryTextColor};">${totalWeight.toFixed(0)} 次互动</span>
            </div>
          </div>
        ` : ''}

        <!-- 底部操作提示 -->
        <div style="padding-top: 10px; border-top: 1px solid ${borderColor}; text-align: center;">
          <span style="font-size: 11px; color: ${highlightColor}; cursor: pointer;">
            点击跳转到微博主页 →
          </span>
        </div>
      </div>
    `;
  }, [chartTheme, graphData, formatNumber]);

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
