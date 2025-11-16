import React, { useState, useEffect, useCallback } from 'react';
import { UserRelationGraph3D } from './UserRelationGraph3D';
import type { UserRelationNetwork, UserRelationType, TimeRange } from '@sker/sdk';
import { UserRelationController } from '@sker/sdk';
import { root } from '@sker/core';

interface UserRelationOverviewProps {
  className?: string;
  height?: number;
}

/**
 * 用户关系概览组件 - 大屏幕专用简化版本
 * 专注于核心可视化，移除所有无关元素
 */
export const UserRelationOverview: React.FC<UserRelationOverviewProps> = ({
  className = '',
  height = 400
}) => {
  const [networkData, setNetworkData] = useState<UserRelationNetwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取真实数据
  const fetchNetwork = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const controller = root.get(UserRelationController);
      const data = await controller.getNetwork(
        'comprehensive' as UserRelationType,
        '7d' as TimeRange,
        1, // minWeight
        100 // limit - 大屏幕显示适量节点
      );
      setNetworkData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setError(`加载失败: ${message}`);
      console.error('Failed to fetch network:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  // 大屏幕专用配置 - 最大化可视化区域
  const bigScreenConfig = {
    nodeSizeWeights: {
      followers: 0.5,
      influence: 0.3,
      postCount: 0.2,
      connections: 0
    },
    linkDistanceConfig: {
      minDistance: 60,
      maxDistance: 150,
      useDynamicDistance: true
    },
    enableNodeShapes: true,
    enableNodeOpacity: true,
    enableNodePulse: true, // 大屏幕开启脉动效果增强视觉吸引力
    enableCommunities: false,
    showDebugHud: false
  };

  // 加载状态 - 简洁的大屏幕样式
  if (loading) {
    return (
      <div
        className={`glass-card flex items-center justify-center ${className}`}
        style={{ height: `${height}px` }}
      >
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
      <div
        className={`glass-card flex items-center justify-center ${className}`}
        style={{ height: `${height}px` }}
      >
        <div className="text-center text-muted-foreground">
          <div className="text-sm">数据加载失败</div>
          <button
            onClick={fetchNetwork}
            className="mt-2 px-3 py-1 text-xs bg-primary hover:bg-primary/90 rounded transition-colors text-primary-foreground"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 无数据状态
  if (!networkData || networkData.nodes.length === 0) {
    return (
      <div
        className={`glass-card flex items-center justify-center ${className}`}
        style={{ height: `${height}px` }}
      >
        <div className="text-center text-muted-foreground">
          <div className="text-3xl mb-1">—</div>
          <div className="text-sm">暂无数据</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`glass-card overflow-hidden ${className}`}
      style={{ height: `${height}px` }}
    >
      {/* 纯可视化区域 - 无标题、无边框、无统计信息 */}
      <div className="w-full h-full">
        <UserRelationGraph3D
          network={networkData}
          className="w-full h-full"
          {...bigScreenConfig}
          onNodeClick={(node) => {
            // 大屏幕点击节点可记录日志，但不做跳转
            console.log('大屏幕节点点击:', node);
          }}
          onNodeHover={(node) => {
            // 悬停效果保持
          }}
        />
      </div>
    </div>
  );
};

export default UserRelationOverview;