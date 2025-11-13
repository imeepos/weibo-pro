import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Network, Activity } from 'lucide-react';
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
  const [timeRange, setTimeRange] = useState<TimeRange>('90d');
  const [minWeight, setMinWeight] = useState(2);
  const [limit, setLimit] = useState(200);
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
    <div className="h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
      {/* 背景网格 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* 未来感渐变光晕 - 多层叠加 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan/20 via-primary/10 to-transparent blur-3xl rounded-full animate-pulse-slow" />
      <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-gradient-to-br from-violet/15 to-transparent blur-3xl rounded-full" />
      <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-gradient-to-br from-fuchsia/15 to-transparent blur-3xl rounded-full" />

      {/* 头部 - 保持不变 */}
      <div className="relative z-10 px-6 py-4 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Network className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">
                用户关系网络 3D 可视化
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              基于微博数据的用户交互关系分析与可视化
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xl font-bold text-primary">
                {network?.statistics.totalUsers || 0}
              </div>
              <div className="text-xs text-muted-foreground">活跃用户</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 主内容区 - flex布局占满剩余空间 */}
      <div className="relative flex-1 overflow-hidden">
        {/* 3D图 - 占满整个区域 */}
        {!isLoading && !error && network && (
          <div className="absolute inset-0">
            {network.nodes.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-5xl mb-3 text-muted-foreground">—</div>
                  <div className="text-lg text-muted-foreground mb-1">暂无数据</div>
                  <div className="text-muted-foreground text-sm">
                    尝试调整筛选条件或扩大时间范围
                  </div>
                </div>
              </div>
            ) : (
              <UserRelationGraph3D
                network={network}
                className="w-full h-full"
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
              />
            )}
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <div className="text-lg text-muted-foreground">加载网络数据中...</div>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md p-6">
              <div className="text-2xl font-bold mb-1 text-destructive">错误</div>
              <div className="text-lg text-destructive mb-2">加载失败</div>
              <div className="text-muted-foreground mb-4 text-sm">{error}</div>
              <button
                onClick={fetchNetwork}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 rounded-md transition-colors text-primary-foreground font-medium text-sm"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {/* 悬浮控制面板 - 左上角 */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-4 left-4 w-80 max-h-[calc(100vh-144px)] overflow-y-auto"
        >
          <div className="backdrop-blur-sm bg-background/50 rounded-lg p-4">
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
          </div>
        </motion.div>

        {/* 悬浮节点详情 - 右上角 */}
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 right-4 w-80"
          >
            <div className="backdrop-blur-sm bg-background/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-base font-semibold">节点详情</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">用户名</div>
                  <div className="font-medium text-sm">{selectedNode.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">用户类型</div>
                  <div className="font-medium text-sm">
                    {getUserTypeLabel(selectedNode.userType)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">粉丝数</div>
                  <div className="font-medium text-sm text-primary">
                    {formatNumber(selectedNode.followers)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">发帖数</div>
                  <div className="font-medium text-sm text-sentiment-positive">
                    {formatNumber(selectedNode.postCount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">影响力</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan via-primary to-violet"
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedNode.influence}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-xs font-medium">{selectedNode.influence}/100</span>
                  </div>
                </div>
                {selectedNode.location && (
                  <div>
                    <div className="text-xs text-muted-foreground">位置</div>
                    <div className="font-medium text-sm">{selectedNode.location}</div>
                  </div>
                )}
                {selectedNode.verified && (
                  <div className="flex items-center gap-2 text-primary text-sm">
                    <Users className="w-3 h-3" />
                    <span>已认证账号</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* 悬浮统计卡片 - 右下角 */}
        {network && network.nodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-4 right-4 grid grid-cols-4 gap-2"
          >
            <div className="backdrop-blur-sm bg-background/50 rounded-lg p-3">
              <div className="text-xl font-bold text-primary">
                {network.statistics.totalUsers}
              </div>
              <div className="text-xs text-muted-foreground">用户节点</div>
            </div>
            <div className="backdrop-blur-sm bg-background/50 rounded-lg p-3">
              <div className="text-xl font-bold text-violet">
                {network.statistics.totalRelations}
              </div>
              <div className="text-xs text-muted-foreground">关系连接</div>
            </div>
            <div className="backdrop-blur-sm bg-background/50 rounded-lg p-3">
              <div className="text-xl font-bold text-cyan">
                {network.statistics.avgDegree}
              </div>
              <div className="text-xs text-muted-foreground">平均度数</div>
            </div>
            <div className="backdrop-blur-sm bg-background/50 rounded-lg p-3">
              <div className="text-xl font-bold text-fuchsia">
                {(network.statistics.density * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">网络密度</div>
            </div>
          </motion.div>
        )}

        {/* 悬浮图例 - 左下角 */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="absolute bottom-4 left-4 backdrop-blur-sm bg-background/50 rounded-lg px-3 py-2 text-xs"
        >
          <div className="font-semibold mb-1">节点类型</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: getUserTypeColor('official') }} />
            <span>官方</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: getUserTypeColor('media') }} />
            <span>媒体</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: getUserTypeColor('kol') }} />
            <span>KOL</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: getUserTypeColor('normal') }} />
            <span>普通</span>
          </div>
        </motion.div>
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
