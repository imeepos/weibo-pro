import React, { useState, useEffect, useMemo } from 'react';
import { UserRelationGraph3D } from './UserRelationGraph3D';
import type { UserRelationNetwork } from '@sker/sdk';

interface UserRelationOverviewProps {
  className?: string;
  height?: number;
}

/**
 * 用户关系概览组件 - 用于首页数据概览页面的简化版本
 * 显示核心用户关系网络，提供快速洞察
 */
export const UserRelationOverview: React.FC<UserRelationOverviewProps> = ({
  className = '',
  height = 400
}) => {
  const [networkData, setNetworkData] = useState<UserRelationNetwork | null>(null);
  const [loading, setLoading] = useState(true);

  // 模拟数据 - 在实际应用中应该从API获取
  useEffect(() => {
    const loadMockData = async () => {
      try {
        setLoading(true);

        // 模拟网络请求延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 生成简化的模拟数据
        const mockNetwork: UserRelationNetwork = {
          nodes: [
            {
              id: 'user1',
              name: '官方媒体',
              userType: 'official',
              followers: 5000000,
              influence: 95,
              postCount: 12000,
              lastActive: new Date().toISOString(),
              location: '北京'
            },
            {
              id: 'user2',
              name: '头部KOL',
              userType: 'kol',
              followers: 2000000,
              influence: 88,
              postCount: 8000,
              lastActive: new Date().toISOString(),
              location: '上海'
            },
            {
              id: 'user3',
              name: '媒体账号',
              userType: 'media',
              followers: 1000000,
              influence: 75,
              postCount: 5000,
              lastActive: new Date().toISOString(),
              location: '广州'
            },
            {
              id: 'user4',
              name: '普通用户A',
              userType: 'normal',
              followers: 50000,
              influence: 45,
              postCount: 800,
              lastActive: new Date().toISOString(),
              location: '深圳'
            },
            {
              id: 'user5',
              name: '普通用户B',
              userType: 'normal',
              followers: 30000,
              influence: 35,
              postCount: 500,
              lastActive: new Date().toISOString(),
              location: '杭州'
            },
            {
              id: 'user6',
              name: '普通用户C',
              userType: 'normal',
              followers: 20000,
              influence: 25,
              postCount: 300,
              lastActive: new Date().toISOString(),
              location: '成都'
            }
          ],
          edges: [
            { source: 'user1', target: 'user2', weight: 95, type: 'follow' },
            { source: 'user1', target: 'user3', weight: 85, type: 'follow' },
            { source: 'user2', target: 'user3', weight: 90, type: 'follow' },
            { source: 'user2', target: 'user4', weight: 70, type: 'follow' },
            { source: 'user3', target: 'user5', weight: 65, type: 'follow' },
            { source: 'user4', target: 'user5', weight: 80, type: 'follow' },
            { source: 'user4', target: 'user6', weight: 60, type: 'follow' },
            { source: 'user5', target: 'user6', weight: 75, type: 'follow' }
          ]
        };

        setNetworkData(mockNetwork);
      } catch (error) {
        console.error('Failed to load user relation data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMockData();
  }, []);

  // 简化的配置 - 适合概览页面
  const simplifiedConfig = useMemo(() => ({
    nodeSizeWeights: {
      followers: 0.4,
      influence: 0.3,
      postCount: 0.2,
      connections: 0.1
    },
    linkDistanceConfig: {
      minDistance: 80,
      maxDistance: 200,
      useDynamicDistance: true
    },
    enableNodeShapes: true,
    enableNodeOpacity: true,
    enableNodePulse: false, // 概览页面关闭脉动效果
    enableCommunities: false // 概览页面关闭社群检测
  }), []);

  if (loading) {
    return (
      <div
        className={`glass-card sentiment-overview-card flex items-center justify-center ${className}`}
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">正在加载用户关系数据...</p>
        </div>
      </div>
    );
  }

  if (!networkData) {
    return (
      <div
        className={`glass-card sentiment-overview-card flex items-center justify-center ${className}`}
        style={{ height: `${height}px` }}
      >
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>数据加载失败</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`glass-card sentiment-overview-card overflow-hidden flex flex-col ${className}`}
      style={{ height: `${height}px` }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            用户关系网络
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            核心用户互动关系可视化
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-xs text-gray-500">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
            <span>官方账号</span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span>KOL</span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <div className="w-3 h-3 rounded-full bg-purple-500 mr-1"></div>
            <span>媒体</span>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="flex-1 min-h-0">
        <UserRelationGraph3D
          network={networkData}
          className="w-full h-full"
          showDebugHud={false}
          {...simplifiedConfig}
          onNodeClick={(node) => {
            console.log('点击节点:', node);
            // 在实际应用中，这里可以跳转到详细页面
          }}
          onNodeHover={(node) => {
            // 悬停效果
          }}
        />
      </div>

      {/* 底部统计信息 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500">
          节点: {networkData.nodes.length} | 连接: {networkData.edges.length}
        </div>
        <div className="text-xs text-gray-500">
          <a
            href="/user-relation-topology"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            查看详情 →
          </a>
        </div>
      </div>
    </div>
  );
};

export default UserRelationOverview;