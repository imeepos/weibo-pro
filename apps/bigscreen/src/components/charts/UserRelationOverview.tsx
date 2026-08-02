import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import UserRelationGraph3DOffscreen from './UserRelationGraph3DOffscreen';
import { useUserRelationNetwork } from '../../hooks/useUserRelationNetwork';
import { useAppStore } from '@/stores/useAppStore';
import type { UserRelationType, UserRelationNode } from '@sker/sdk';

interface UserRelationOverviewProps {
  className?: string;
}

/**
 * 用户关系概览组件 - 大屏幕专用简化版本
 * 专注于核心可视化，移除所有无关元素
 * 自适应父容器高度
 */
export const UserRelationOverview: React.FC<UserRelationOverviewProps> = ({
  className = ''
}) => {
  const navigate = useNavigate();
  const selectedTimeRange = useAppStore((state) => state.selectedTimeRange);
  const [relationType] = useState<UserRelationType>('comprehensive');
  const [edgeThreshold] = useState(10);

  const { network, isLoading, error, refetch } = useUserRelationNetwork({
    relationType,
    timeRange: selectedTimeRange,
    minWeight: 1,
    limit: 5000,
  });

  const summaryItems = useMemo(() => {
    const stats = network?.statistics;
    if (!stats) return [];

    return [
      {
        label: '网络节点',
        value: stats.totalUsers.toLocaleString('zh-CN'),
      },
      {
        label: '关系边',
        value: stats.totalRelations.toLocaleString('zh-CN'),
      },
      {
        label: '社区数',
        value: (stats.communities ?? 0).toLocaleString('zh-CN'),
      },
    ];
  }, [network?.statistics]);

  const handleFullscreen = () => {
    navigate('/user-relation-topology');
  };

  const handleNodeClick = useCallback((_node: UserRelationNode) => {
  }, []);

  const handleNodeHover = useCallback((_node: UserRelationNode | null) => {
  }, []);

  const fullscreenButton = (
    <button
      onClick={handleFullscreen}
      className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-background/80 hover:bg-background transition-opacity opacity-0 hover:opacity-100"
      title="全屏查看"
    >
      <Maximize2 className="w-4 h-4 text-foreground" />
    </button>
  );

  // 加载状态 - 简洁的大屏幕样式
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full w-full relative ${className}`}>
        {fullscreenButton}
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-muted-foreground text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={`flex items-center justify-center h-full w-full relative ${className}`}>
        {fullscreenButton}
        <div className="text-center text-muted-foreground">
          <div className="text-sm">数据加载失败</div>
          <button
            onClick={refetch}
            className="mt-2 px-3 py-1 text-xs bg-primary hover:bg-primary/90 rounded transition-colors text-primary-foreground"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 无数据状态
  if (!network?.nodes?.length) {
    return (
      <div className={`flex items-center justify-center h-full w-full relative ${className}`}>
        {fullscreenButton}
        <div className="text-center text-muted-foreground">
          <div className="text-3xl mb-1">—</div>
          <div className="text-sm">暂无数据</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full overflow-hidden relative ${className}`}>
      {fullscreenButton}
      {summaryItems.length > 0 ? (
        <div className="absolute inset-x-3 top-3 z-10 grid grid-cols-3 gap-2">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-md border border-border/60 bg-background/85 px-3 py-2 backdrop-blur-sm"
            >
              <div className="text-[11px] text-muted-foreground">{item.label}</div>
              <div className="text-sm font-semibold text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="w-full h-full pt-16">
        <UserRelationGraph3DOffscreen
          network={network}
          className="w-full h-full"
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          edgeThreshold={edgeThreshold}
        />
      </div>
    </div>
  );
};

export default UserRelationOverview;
