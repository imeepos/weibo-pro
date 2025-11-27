import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Network } from 'lucide-react';
import UserRelationGraph3D from '../components/charts/UserRelationGraph3D';
import { getUserTypeColor } from '../components/charts/UserRelationGraph3D.utils';
import UserRelationControls from '../components/charts/UserRelationControls';
import NodeDetailPanel from '../components/charts/NodeDetailPanel';
import NetworkStatisticsCards from '../components/charts/NetworkStatisticsCards';
import NodeTypeLegend from '../components/charts/NodeTypeLegend';
import { useUserRelationNetwork } from '../hooks/useUserRelationNetwork';
import type {
  UserRelationType,
  TimeRange,
  UserRelationNode,
} from '@sker/sdk';

const USER_TYPE_CONFIGS = [
  { value: 'official', label: '官方', color: getUserTypeColor('official') },
  { value: 'media', label: '媒体', color: getUserTypeColor('media') },
  { value: 'kol', label: 'KOL', color: getUserTypeColor('kol') },
  { value: 'normal', label: '普通', color: getUserTypeColor('normal') },
];

const UserRelationTopology: React.FC = () => {
  const [relationType, setRelationType] = useState<UserRelationType>('comprehensive');
  const [timeRange, setTimeRange] = useState<TimeRange>('90d');
  const [minWeight, setMinWeight] = useState(1);
  const [limit, setLimit] = useState(5000);
  const [selectedNode, setSelectedNode] = useState<UserRelationNode | null>(null);

  const { network, isLoading, error, refetch } = useUserRelationNetwork({
    relationType,
    timeRange,
    minWeight,
    limit,
  });

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
                enableCommunities={true}
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
                onClick={refetch}
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
          className="absolute top-12 left-6 w-72 max-h-[calc(100vh-160px)] overflow-y-auto"
        >
          <div className="glass-card p-3">
            <UserRelationControls
              relationType={relationType}
              onRelationTypeChange={setRelationType}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              minWeight={minWeight}
              onMinWeightChange={setMinWeight}
              limit={limit}
              onLimitChange={setLimit}
              onRefresh={refetch}
              isLoading={isLoading}
            />
          </div>
        </motion.div>

        {/* 悬浮节点详情 - 右上角 */}
        <NodeDetailPanel
          node={selectedNode}
          position="right"
          className="absolute top-12 right-6 w-72"
        />

        {/* 悬浮统计卡片 - 右下角 */}
        {network && network.nodes.length > 0 && (
          <NetworkStatisticsCards
            statistics={network.statistics}
            className="absolute bottom-6 right-8"
          />
        )}

        {/* 悬浮图例 - 左下角 */}
        <NodeTypeLegend
          types={USER_TYPE_CONFIGS}
          className="absolute bottom-6 left-8"
        />
      </div>
    </div>
  );
};

export default UserRelationTopology;
