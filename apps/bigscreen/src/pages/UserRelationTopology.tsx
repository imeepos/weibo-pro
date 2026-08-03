import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, useDragControls } from 'framer-motion';
import UserRelationGraph3DOffscreen from '../components/charts/UserRelationGraph3DOffscreen';
import { getUserTypeColor } from '../components/charts/UserRelationGraph3D.utils';
import { sanitizeUserRelationNetwork } from '../components/charts/UserRelationGraph3D.sanitize';
import UserRelationControls from '../components/charts/UserRelationControls';
import NodeDetailPanel from '../components/charts/NodeDetailPanel';
import NetworkStatisticsCards from '../components/charts/NetworkStatisticsCards';
import NodeTypeLegend from '../components/charts/NodeTypeLegend';
import { useUserRelationNetwork } from '../hooks/useUserRelationNetwork';
import { useAppStore } from '../stores/useAppStore';
import type {
  UserRelationType,
  UserRelationNode,
} from '@sker/sdk';

const USER_TYPE_CONFIGS = [
  { value: 'official', label: '官方', color: getUserTypeColor('official') },
  { value: 'media', label: '媒体', color: getUserTypeColor('media') },
  { value: 'kol', label: 'KOL', color: getUserTypeColor('kol') },
  { value: 'normal', label: '普通', color: getUserTypeColor('normal') },
];

const UserRelationTopology: React.FC = () => {
  const { selectedTimeRange, setSelectedTimeRange: _setSelectedTimeRange } = useAppStore();
  const [relationType, setRelationType] = useState<UserRelationType>(() => {
    const saved = localStorage.getItem('userRelation.relationType');
    return (saved as UserRelationType) || 'comprehensive';
  });
  const [eventId, setEventId] = useState<string | undefined>(() => {
    const saved = localStorage.getItem('userRelation.eventId');
    return saved || undefined;
  });
  const [minWeight, setMinWeight] = useState(() => {
    const saved = localStorage.getItem('userRelation.minWeight');
    return saved ? parseInt(saved) : 1;
  });
  const [limit, setLimit] = useState(() => {
    const saved = localStorage.getItem('userRelation.limit');
    return saved ? parseInt(saved) : 10000;
  });
  const [debouncedLimit, setDebouncedLimit] = useState(() => {
    const saved = localStorage.getItem('userRelation.limit');
    return saved ? parseInt(saved) : 10000;
  });
  const [edgeThreshold, setEdgeThreshold] = useState(() => {
    const saved = localStorage.getItem('userRelation.edgeThreshold');
    return saved ? parseInt(saved) : 10;
  });
  const [selectedNode, setSelectedNode] = useState<UserRelationNode | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const dragControls = useDragControls();
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('controlPanel.position');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedLimit(limit);
    }, 500);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [limit]);

  useEffect(() => {
    if (eventId) {
      localStorage.setItem('userRelation.eventId', eventId);
    } else {
      localStorage.removeItem('userRelation.eventId');
    }
  }, [eventId]);

  const { network, isLoading, error, refetch } = useUserRelationNetwork({
    relationType,
    timeRange: selectedTimeRange,
    eventId,
    minWeight,
    limit: debouncedLimit,
  });
  const visibleNetwork = useMemo(
    () => (network ? sanitizeUserRelationNetwork(network, edgeThreshold) : null),
    [network, edgeThreshold]
  );

  const handleNodeClick = useCallback((node: UserRelationNode) => {
    setSelectedNode(node);
  }, []);

  const handleNodeHover = useCallback((_node: UserRelationNode | null) => {
  }, []);

  return (
    <div className="h-full bg-zinc-50 dark:bg-zinc-950 text-foreground relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#71717a14_1px,transparent_1px),linear-gradient(to_bottom,#71717a14_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-border/80" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/80 to-transparent" />

      {/* 主内容区 - flex布局占满剩余空间 */}
      <div className="relative flex-1 overflow-hidden">
        {/* 3D图 - 占满整个区域 */}
        {!isLoading && !error && visibleNetwork && (
          <div className="absolute inset-0">
            {visibleNetwork.nodes.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center backdrop-blur-md bg-background/90 dark:bg-background/75 rounded-lg shadow-xl border border-border p-8 max-w-sm">
                  <div className="text-xl font-semibold text-foreground mb-2">暂无有效关系</div>
                  <div className="text-muted-foreground text-sm leading-6">
                    当前筛选下没有满足展示质量的真实用户关系。可降低最小交互次数、扩大时间范围或切换事件筛选。
                  </div>
                </div>
              </div>
            ) : (
              <UserRelationGraph3DOffscreen
                network={visibleNetwork}
                className="w-full h-full"
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                edgeThreshold={edgeThreshold}
              />
            )}
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-background/30">
            <div className="text-center backdrop-blur-md bg-background/90 dark:bg-background/75 rounded-lg shadow-xl border border-border p-8">
              <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-lg font-semibold text-foreground">加载网络数据中</div>
              <div className="text-sm text-muted-foreground mt-2">正在构建关系图谱</div>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-background/30">
            <div className="text-center max-w-md backdrop-blur-md bg-background/90 dark:bg-background/75 rounded-lg shadow-xl border border-border p-8">
              <div className="text-lg text-destructive mb-3">加载失败</div>
              <div className="text-muted-foreground mb-6 text-sm bg-destructive/10 rounded-md p-3">{error}</div>
              <button
                onClick={refetch}
                className="px-6 py-3 bg-primary hover:bg-primary/90 rounded-md transition-all duration-200 text-primary-foreground font-medium text-sm shadow-md hover:shadow-lg"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {/* 悬浮控制面板 - 可拖拽 */}
        <motion.div
          drag
          dragControls={dragControls}
          dragMomentum={false}
          dragElastic={0}
          style={{ left: 24, top: 48, x: position.x, y: position.y }}
          onDragEnd={(_, info) => {
            const newPosition = {
              x: position.x + info.offset.x,
              y: position.y + info.offset.y
            };
            setPosition(newPosition);
            localStorage.setItem('controlPanel.position', JSON.stringify(newPosition));
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute w-72"
        >
          <div
            className="glass-card p-3"
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('[data-drag-handle]')) {
                dragControls.start(e);
              }
            }}
          >
            <UserRelationControls
              relationType={relationType}
              onRelationTypeChange={setRelationType}
              eventId={eventId}
              onEventIdChange={setEventId}
              minWeight={minWeight}
              onMinWeightChange={setMinWeight}
              limit={limit}
              onLimitChange={setLimit}
              edgeThreshold={edgeThreshold}
              onEdgeThresholdChange={setEdgeThreshold}
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
        {visibleNetwork && visibleNetwork.nodes.length > 0 && (
          <NetworkStatisticsCards
            statistics={visibleNetwork.statistics}
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
