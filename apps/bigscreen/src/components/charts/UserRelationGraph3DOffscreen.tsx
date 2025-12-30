/**
 * UserRelationGraph3D - OffscreenCanvas 版本
 * 使用 Worker 线程渲染，支持更大规模的图数据
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { UserRelationNetwork, UserRelationNode } from '@sker/sdk';
import {
  SharedBufferManager,
  DataStreamer,
  useGraphStore,
} from '@sker/ui/lib/graph-data-stream/index';
import { useOffscreenGraph } from '@sker/ui/lib/graph-offscreen-renderer/index';
import { useGraphLayout } from '@sker/ui/lib/graph-gpu-compute/index';
import { LouvainCommunityDetector } from '@sker/ui/lib/graph-community-detector';

interface UserRelationGraph3DOffscreenProps {
  network: UserRelationNetwork;
  className?: string;
  onNodeClick?: (node: UserRelationNode) => void;
  onNodeHover?: (node: UserRelationNode | null) => void;
  showDebugHud?: boolean;
  edgeThreshold?: number;
}

const MAX_NODES = 100000;
const MAX_EDGES = 500000;

export const UserRelationGraph3DOffscreen: React.FC<UserRelationGraph3DOffscreenProps> = ({
  network,
  className = '',
  onNodeClick,
  showDebugHud = true,
  edgeThreshold = 20,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 状态管理
  const [isLoading, setIsLoading] = useState(true);
  const [bufferManager, setBufferManager] = useState<SharedBufferManager | null>(null);

  // Zustand Store
  const {
    nodeCount,
    edgeCount,
    loadProgress,
    fps,
    sharedBuffers,
    nodeMetadata,
    lodStats,
    setNodeCount,
    setEdgeCount,
    setLoadProgress,
    setSharedBuffers,
    setNodeMetadata,
    setNodeIdMap,
  } = useGraphStore();

  // 布局 Hook
  const {
    isLayouting,
    layoutState,
    startLayout,
    stopLayout,
    setCommunities,
  } = useGraphLayout({
    buffers: sharedBuffers,
    nodeCount,
    edgeCount,
    autoStart: false,
    config: {
      maxIterations: 500,
      repulsionStrength: 30,
      attractionStrength: 0.5,
      damping: 0.8,
    },
    onProgress: (state) => {
      // 每 20 次迭代输出一次进度
      if (state.iteration % 20 === 0) {
        console.log(`🔄 布局进度: ${state.iteration}/${state.iteration}`, {
          energy: state.energy.toFixed(2),
          delta: state.delta.toFixed(4),
        });
      }
    },
    onConverged: (state) => {
      console.log('✅ 布局收敛完成', state);
    },
  });

  // OffscreenCanvas Hook
  const {
    handleClick,
    setNodeCount: updateWorkerNodeCount,
    workerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useOffscreenGraph(canvasRef, sharedBuffers, {
    maxNodes: MAX_NODES,
    maxEdges: MAX_EDGES,
    onReady: () => {
      console.log('✅ OffscreenCanvas 渲染器已就绪');
    },
    onError: (error) => {
      console.error('❌ 渲染器错误:', error);
    },
    onNodeClick: (nodeIndex) => {
      const node = nodeMetadata[nodeIndex];
      if (node && onNodeClick) {
        onNodeClick(node as any);
      }
    },
  });

  /**
   * 加载图数据
   */
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      try {
        // 1. 创建 SharedBufferManager
        const manager = new SharedBufferManager({
          maxNodes: MAX_NODES,
          maxEdges: MAX_EDGES,
        });
        setBufferManager(manager);
        setSharedBuffers(manager.getBuffers());

        // 2. 创建 DataStreamer
        const streamer = new DataStreamer({
          chunkSize: 5000,
          maxNodes: MAX_NODES,
          maxEdges: MAX_EDGES,
          edgeThreshold,
        });

        // 3. 构建节点 ID 映射
        const nodeIdMap = streamer.buildNodeIdMap(network.nodes);
        setNodeIdMap(nodeIdMap);

        // 4. 流式加载数据
        let totalNodesLoaded = 0;
        const allMetadata: any[] = [];

        for await (const { nodeChunk, edgeChunk } of streamer.fromNetwork(network)) {
          if (nodeChunk && nodeChunk.nodes.length > 0) {
            // 转换为二进制格式
            const binaryData = streamer.nodesToBinary(nodeChunk.nodes, totalNodesLoaded);

            // 更新 SharedBuffer
            manager.batchUpdatePositions(binaryData.positions, totalNodesLoaded * 3);
            manager.batchUpdateColors(binaryData.colors, totalNodesLoaded * 3);
            manager.batchUpdateSizes(binaryData.sizes, totalNodesLoaded);

            // 保存元数据
            allMetadata.push(...binaryData.metadata);

            totalNodesLoaded = nodeChunk.progress;
            setNodeCount(totalNodesLoaded);
            setLoadProgress(totalNodesLoaded);

            // 通知 Worker 更新节点数量
            updateWorkerNodeCount(totalNodesLoaded);

            // 第一批数据加载完成后就显示画布
            if (totalNodesLoaded > 0 && isLoading) {
              setIsLoading(false);
            }

            console.log(`📦 已加载 ${totalNodesLoaded} 个节点`);
          }

          if (edgeChunk && edgeChunk.edges.length > 0) {
            const binaryEdges = streamer.edgesToBinary(edgeChunk.edges, nodeIdMap);
            manager.batchUpdateEdgeIndices(binaryEdges.indices);
            manager.batchUpdateEdgeWeights(binaryEdges.weights);

            const currentEdgeCount = edgeChunk.progress;
            setEdgeCount(currentEdgeCount);

            // 通知渲染 Worker 更新边数量
            if (workerRef.current) {
              workerRef.current.postMessage({
                type: 'UPDATE_EDGE_COUNT',
                count: currentEdgeCount,
              });
            }
          }
        }

        setNodeMetadata(allMetadata);
        console.log(`✅ 数据加载完成: ${totalNodesLoaded} 节点, ${network.edges.length} 边`);

        // 执行社区检测
        console.log('🔍 开始社区检测...');
        const detector = new LouvainCommunityDetector(network.nodes, network.edges);
        const communities = detector.detectCommunities();
        console.log(`✅ 检测到 ${communities.length} 个社区群组`);

        // 创建节点ID到社区的映射
        const nodeToCommunity = new Map<string, number>();
        communities.forEach((community) => {
          community.nodes.forEach((nodeId) => {
            nodeToCommunity.set(nodeId, community.id);
          });
        });

        // 创建节点索引到社区的映射（用于布局算法）
        const nodeIndexToCommunity = new Map<number, number>();
        for (let i = 0; i < totalNodesLoaded; i++) {
          const nodeId = allMetadata[i]?.id;
          if (nodeId) {
            const communityId = nodeToCommunity.get(nodeId);
            if (communityId !== undefined) {
              nodeIndexToCommunity.set(i, communityId);
            }
          }
        }

        // 用社区颜色覆盖节点颜色
        for (let i = 0; i < totalNodesLoaded; i++) {
          const nodeId = allMetadata[i]?.id;
          if (nodeId) {
            const communityId = nodeToCommunity.get(nodeId);
            if (communityId !== undefined) {
              const community = communities.find((c) => c.id === communityId);
              if (community) {
                // 将十六进制颜色转换为 RGB
                const hex = community.color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;

                // 更新颜色缓冲区
                manager.batchUpdateColors(new Float32Array([r, g, b]), i * 3);
              }
            }
          }
        }

        // 将社群信息传递给布局引擎
        setCommunities(nodeIndexToCommunity);

        // 数据加载完成后，启动布局计算
        console.log('🚀 启动布局计算...');
        startLayout();
      } catch (error) {
        console.error('❌ 数据加载失败:', error);
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      stopLayout();
      bufferManager?.dispose();
    };
  }, [network, edgeThreshold]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 主渲染 Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ display: 'block' }}
      />

      {/* 加载进度 - 改为角落提示 */}
      {loadProgress < nodeCount && nodeCount > 0 && (
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm text-foreground px-3 py-2 text-xs rounded-lg shadow-lg border border-border">
          <div className="flex items-center gap-2">
            <div className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>加载中 {loadProgress.toLocaleString()} 节点</span>
          </div>
        </div>
      )}

      {/* 调试 HUD */}
      {showDebugHud && nodeCount > 0 && (
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm text-foreground p-3 text-xs font-mono rounded shadow-lg space-y-2 border border-border">
          <div className="font-bold text-primary">🎨 OffscreenCanvas 渲染器</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>FPS:</div>
            <div className="text-right">{fps.toFixed(1)}</div>
            <div>节点数:</div>
            <div className="text-right">{nodeCount.toLocaleString()}</div>
            <div>边数:</div>
            <div className="text-right">{edgeCount.toLocaleString()}</div>
            <div>内存:</div>
            <div className="text-right">
              {bufferManager
                ? (bufferManager.getMemoryUsage() / 1024 / 1024).toFixed(1)
                : '0'}{' '}
              MB
            </div>
          </div>

          {/* 布局状态 */}
          {layoutState && (
            <>
              <div className="border-t border-white/20 pt-2"></div>
              <div className="font-bold text-green-400">⚡ 布局计算</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>状态:</div>
                <div className="text-right">
                  {isLayouting ? (
                    <span className="text-yellow-400">计算中...</span>
                  ) : layoutState.isConverged ? (
                    <span className="text-green-400">已收敛</span>
                  ) : (
                    <span className="text-gray-400">已停止</span>
                  )}
                </div>
                <div>迭代:</div>
                <div className="text-right">{layoutState.iteration}</div>
                <div>能量:</div>
                <div className="text-right">{layoutState.energy.toFixed(2)}</div>
                <div>耗时:</div>
                <div className="text-right">{(layoutState.elapsedTime / 1000).toFixed(1)}s</div>
              </div>
            </>
          )}

          {/* LOD 统计 */}
          {lodStats && (
            <>
              <div className="border-t border-white/20 pt-2"></div>
              <div className="font-bold text-blue-400">🎯 LOD 系统</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>可见节点:</div>
                <div className="text-right text-green-400">
                  {lodStats.visibleNodes.toLocaleString()}
                </div>
                <div>剔除节点:</div>
                <div className="text-right text-red-400">
                  {lodStats.culledNodes.toLocaleString()}
                </div>
                <div>剔除率:</div>
                <div className="text-right">
                  {lodStats.totalNodes > 0
                    ? ((lodStats.culledNodes / lodStats.totalNodes) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>

              {/* LOD 分布 */}
              <div className="mt-2 text-xs">
                <div className="text-white/70 mb-1">LOD 分布:</div>
                {Object.entries(lodStats.lodDistribution).map(([level, count]) => {
                  if (count === 0) return null;
                  const levelNames = ['Ultra', 'High', 'Med', 'Low', 'Dist'];
                  return (
                    <div key={level} className="flex justify-between items-center mb-0.5">
                      <span className="text-white/60">L{level} ({levelNames[parseInt(level)]}):</span>
                      <span className="text-white">{count.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* 提示信息 */}
      {nodeCount > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 text-foreground px-4 py-2 text-xs rounded-lg backdrop-blur-sm border border-border">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
              拖拽旋转
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
              滚轮缩放
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-pink-400 rounded-full animate-pulse"></span>
              点击查看详情
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRelationGraph3DOffscreen;
