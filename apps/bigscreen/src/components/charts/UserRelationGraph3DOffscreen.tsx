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
} from '@sker/ui/lib/graph-data-stream';
import { useOffscreenGraph } from '@sker/ui/lib/graph-offscreen-renderer';
import { useGraphLayout } from '@sker/ui/lib/graph-gpu-compute';

interface UserRelationGraph3DOffscreenProps {
  network: UserRelationNetwork;
  className?: string;
  onNodeClick?: (node: UserRelationNode) => void;
  onNodeHover?: (node: UserRelationNode | null) => void;
  showDebugHud?: boolean;
}

const MAX_NODES = 100000;
const MAX_EDGES = 500000;

export const UserRelationGraph3DOffscreen: React.FC<UserRelationGraph3DOffscreenProps> = ({
  network,
  className = '',
  onNodeClick,
  showDebugHud = true,
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
  } = useGraphLayout({
    buffers: sharedBuffers,
    nodeCount,
    edgeCount,
    autoStart: false, // 手动控制
    config: {
      maxIterations: 300,
      repulsionStrength: 100,
      attractionStrength: 0.1,
      damping: 0.85,
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

        // 数据加载完成后，启动布局计算
        console.log('🚀 启动布局计算...');
        startLayout();
      } catch (error) {
        console.error('❌ 数据加载失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      stopLayout();
      bufferManager?.dispose();
    };
  }, [network]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 主渲染 Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onClick={handleClick}
        style={{ display: 'block' }}
      />

      {/* 加载进度 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-sm">加载中... {loadProgress.toLocaleString()} 节点</p>
          </div>
        </div>
      )}

      {/* 调试 HUD */}
      {showDebugHud && !isLoading && (
        <div className="absolute top-4 left-4 bg-black/80 text-white p-3 text-xs font-mono rounded shadow-lg space-y-2">
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
        </div>
      )}

      {/* 提示信息 */}
      {!isLoading && (
        <div className="absolute bottom-4 right-4 bg-black/80 text-white p-2 text-xs rounded">
          点击节点查看详情
        </div>
      )}
    </div>
  );
};

export default UserRelationGraph3DOffscreen;
