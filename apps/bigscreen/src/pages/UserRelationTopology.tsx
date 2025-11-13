import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { root } from '@sker/core';
import UserRelationGraph3D from '../components/charts/UserRelationGraph3D';
import UserRelationControls from '../components/charts/UserRelationControls';
import type {
  UserRelationNetwork,
  UserRelationType,
  TimeRange,
  UserRelationNode,
} from '@sker/sdk';
import { UserRelationController } from '@sker/sdk';

const UserRelationTopology: React.FC = () => {
  const [relationType, setRelationType] = useState<UserRelationType>('comprehensive');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [minWeight, setMinWeight] = useState(2);
  const [limit, setLimit] = useState(100);
  const [network, setNetwork] = useState<UserRelationNetwork | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<UserRelationNode | null>(null);

  const fetchNetwork = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const controller = root.get(UserRelationController);
      const data = await controller.getNetwork(
        relationType,
        timeRange,
        minWeight,
        limit
      );
      setNetwork(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setError(`加载失败: ${message}`);
      console.error('Failed to fetch network:', err);
    } finally {
      setIsLoading(false);
    }
  }, [relationType, timeRange, minWeight, limit]);

  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  const handleNodeClick = useCallback((node: UserRelationNode) => {
    setSelectedNode(node);
  }, []);

  const handleNodeHover = useCallback((node: UserRelationNode | null) => {
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-6 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold mb-2">
                🌐 用户关系网络 3D 可视化
              </h1>
              <p className="text-gray-300">
                基于微博数据的用户交互关系分析与可视化
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">
                {network?.statistics.totalUsers || 0}
              </div>
              <div className="text-sm text-gray-400">活跃用户</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧控制面板 */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <UserRelationControls
              relationType={relationType}
              onRelationTypeChange={setRelationType}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              minWeight={minWeight}
              onMinWeightChange={setMinWeight}
              limit={limit}
              onLimitChange={setLimit}
              onRefresh={fetchNetwork}
              isLoading={isLoading}
            />

            {/* 选中节点详情 */}
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-lg p-6 shadow-2xl border border-white/20"
              >
                <h3 className="text-lg font-bold mb-4">节点详情</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-400">用户名</div>
                    <div className="font-medium">{selectedNode.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">用户类型</div>
                    <div className="font-medium">
                      {getUserTypeLabel(selectedNode.userType)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">粉丝数</div>
                    <div className="font-medium text-blue-400">
                      {formatNumber(selectedNode.followers)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">发帖数</div>
                    <div className="font-medium text-green-400">
                      {formatNumber(selectedNode.postCount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">影响力</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedNode.influence}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="text-sm font-medium">{selectedNode.influence}/100</span>
                    </div>
                  </div>
                  {selectedNode.location && (
                    <div>
                      <div className="text-sm text-gray-400">位置</div>
                      <div className="font-medium">{selectedNode.location}</div>
                    </div>
                  )}
                  {selectedNode.verified && (
                    <div className="flex items-center gap-2 text-blue-400">
                      <span>✓</span>
                      <span>已认证账号</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* 右侧3D可视化区域 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3"
          >
            <div className="bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
              {isLoading && (
                <div className="flex items-center justify-center h-[800px]">
                  <div className="text-center">
                    <div className="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <div className="text-xl text-gray-400">加载网络数据中...</div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center h-[800px]">
                  <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">⚠️</div>
                    <div className="text-xl text-red-400 mb-2">加载失败</div>
                    <div className="text-gray-400 mb-4">{error}</div>
                    <button
                      onClick={fetchNetwork}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      重试
                    </button>
                  </div>
                </div>
              )}

              {!isLoading && !error && network && (
                <div style={{ height: '800px' }}>
                  {network.nodes.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="text-6xl mb-4">📊</div>
                        <div className="text-xl text-gray-400 mb-2">暂无数据</div>
                        <div className="text-gray-500">
                          尝试调整筛选条件或扩大时间范围
                        </div>
                      </div>
                    </div>
                  ) : (
                    <UserRelationGraph3D
                      network={network}
                      onNodeClick={handleNodeClick}
                      onNodeHover={handleNodeHover}
                    />
                  )}
                </div>
              )}
            </div>

            {/* 底部统计卡片 */}
            {network && network.nodes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-4 gap-4 mt-6"
              >
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-lg p-4 border border-blue-700/50">
                  <div className="text-2xl font-bold text-blue-400">
                    {network.statistics.totalUsers}
                  </div>
                  <div className="text-sm text-gray-400">用户节点</div>
                </div>
                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-lg p-4 border border-purple-700/50">
                  <div className="text-2xl font-bold text-purple-400">
                    {network.statistics.totalRelations}
                  </div>
                  <div className="text-sm text-gray-400">关系连接</div>
                </div>
                <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-lg p-4 border border-green-700/50">
                  <div className="text-2xl font-bold text-green-400">
                    {network.statistics.avgDegree}
                  </div>
                  <div className="text-sm text-gray-400">平均度数</div>
                </div>
                <div className="bg-gradient-to-br from-amber-900/50 to-amber-800/50 rounded-lg p-4 border border-amber-700/50">
                  <div className="text-2xl font-bold text-amber-400">
                    {(network.statistics.density * 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-400">网络密度</div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

function getUserTypeLabel(userType: string): string {
  switch (userType) {
    case 'official':
      return '官方账号';
    case 'media':
      return '媒体账号';
    case 'kol':
      return 'KOL账号';
    case 'normal':
      return '普通用户';
    default:
      return '未知';
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export default UserRelationTopology;
