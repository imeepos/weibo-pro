import React, { useState, useEffect, useCallback } from 'react';
import { UserRelationGraph3D } from './UserRelationGraph3D';
import type { UserRelationNetwork, UserRelationType, TimeRange } from '@sker/sdk';
import { UserRelationController } from '@sker/sdk';
import { root } from '@sker/core';
import { useAppStore } from '@/stores/useAppStore';

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
  const [networkData, setNetworkData] = useState<UserRelationNetwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedTimeRange } = useAppStore()
  // 获取真实数据
  const fetchNetwork = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {

      const controller = root.get(UserRelationController);

      const data = await controller.getNetwork(
        'comprehensive' as UserRelationType,
        selectedTimeRange,
        1, // minWeight
        5000 // limit - 支持2000个节点
      );

      setNetworkData(data);
    } catch (err) {
      console.error('❌ 获取数据失败:', err);
      console.error('❌ 错误堆栈:', err instanceof Error ? err.stack : '无堆栈信息');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange]);

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
      minDistance: 10,
      maxDistance: 60,
      useDynamicDistance: true
    },
    enableNodeShapes: true,
    enableNodeOpacity: true,
    enableNodePulse: false, // 禁用脉动动画减少卡顿
    enableCommunities: true, // 开启社群颜色区分
    showDebugHud: false
  };

  // 加载状态 - 简洁的大屏幕样式
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full w-full ${className}`}>
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
      <div className={`flex items-center justify-center h-full w-full ${className}`}>
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
      <div className={`flex items-center justify-center h-full w-full ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="text-3xl mb-1">—</div>
          <div className="text-sm">暂无数据</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full overflow-hidden relative ${className}`}>
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