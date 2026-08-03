import { useCallback, useEffect, useRef, useState } from 'react';
import { DataSet, Network } from 'vis-network/standalone';
import { createLogger } from '@sker/core';
import { fetchNodeDetail, fetchTopologyData } from './api';
import { networkOptions } from './options';
import {
  buildEdgesArray,
  buildNodesArray,
  createEmptyStatistics,
  getMockTopologyData,
  normalizeTopologyData
} from './transform';
import type { NodeInfo, TopologyData, TopologyStatistics } from './types';

const logger = createLogger('NetworkTopologyDashboard');

export interface UseNetworkTopologyOptions {
  customerId?: string;
  onNodeClick?: (nodeInfo: NodeInfo) => void;
}

export interface UseNetworkTopologyResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  error: string | null;
  statistics: TopologyStatistics;
  loadData: (id?: string) => Promise<void>;
}

/**
 * 网络拓扑仪表盘核心逻辑 hook
 * - 管理加载状态、错误信息、统计信息
 * - 获取拓扑数据并渲染 vis-network
 * - 绑定节点点击事件
 *
 * 数据流：loadData 拉取数据 -> topologyData 状态 -> effect 在容器渲染完成后创建网络实例
 */
export const useNetworkTopology = ({
  customerId = '',
  onNodeClick
}: UseNetworkTopologyOptions): UseNetworkTopologyResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<TopologyStatistics>(createEmptyStatistics());
  const [topologyData, setTopologyData] = useState<TopologyData | null>(null);

  // 保持最新回调，避免事件处理器中的过期闭包
  const previousNodeIdRef = useRef('');
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  /**
   * 获取节点详情
   */
  const fetchNodeDetails = useCallback(
    async (nodeId: string) => {
      try {
        const response = await fetchNodeDetail(nodeId, customerId);
        if (response.success && response.data) {
          onNodeClickRef.current?.(response.data);
        }
      } catch {
        // 如果 API 失败，创建基本的节点信息
        const basicNodeInfo: NodeInfo = {
          nodeId,
          nodeType: 'UNKNOWN',
          friendlyName: `Node ${nodeId}`
        };
        onNodeClickRef.current?.(basicNodeInfo);
        logger.debug('Using fallback node info for:', nodeId);
      }
    },
    [customerId]
  );

  /**
   * 绑定网络事件
   */
  const bindNetworkEvents = useCallback(
    (network: Network) => {
      network.on('click', (params: { nodes: (string | number)[] }) => {
        logger.debug('Network click event:', params);
        if (params.nodes.length > 0 && previousNodeIdRef.current !== params.nodes[0]) {
          const nodeId = params.nodes[0] as string;
          fetchNodeDetails(nodeId);
          previousNodeIdRef.current = nodeId;
        }
      });

      network.on('oncontext', (params: unknown) => {
        logger.debug('Network context menu event:', params);
      });
    },
    [fetchNodeDetails]
  );

  /**
   * 处理拓扑数据：构建节点/边并创建网络实例
   */
  const processTopologyData = useCallback(
    async (data: TopologyData) => {
      try {
        logger.debug('Processing topology data:', data);
        const nodes = buildNodesArray(data);
        const edges = buildEdgesArray(data);

        logger.debug('Generated nodes:', nodes.length);
        logger.debug('Generated edges:', edges.length);

        if (containerRef.current && nodes.length > 0) {
          const nodesDataSet = new DataSet(nodes);
          const edgesDataSet = new DataSet(edges);

          const networkData = {
            nodes: nodesDataSet,
            edges: edgesDataSet
          };

          // 销毁旧的网络实例
          if (networkRef.current) {
            networkRef.current.destroy();
          }

          // 创建新的网络实例
          networkRef.current = new Network(containerRef.current, networkData, networkOptions);

          // 绑定事件处理器
          bindNetworkEvents(networkRef.current);

          // 保持物理引擎启用
          networkRef.current.on('stabilizationIterationsDone', () => {
            if (networkRef.current) {
              logger.debug('Physics stabilization complete, keeping physics enabled');
            }
          });

          logger.debug('Network topology created successfully');
        } else if (nodes.length === 0) {
          logger.warn('No nodes generated from topology data');
          setError('没有生成有效的网络节点');
        }
      } catch (err) {
        logger.error('Failed to process topology data:', err);
        setError('处理拓扑数据时发生错误');
      }
    },
    [bindNetworkEvents]
  );

  /**
   * 获取拓扑数据
   */
  const loadData = useCallback(
    async (id?: string) => {
      if (!id && !customerId) {
        logger.warn('No customer ID provided for topology data fetch');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 使用 API 客户端获取数据
        const response = await fetchTopologyData(id || customerId);

        if (response.success && response.data) {
          // 处理数据格式：如果 response.data 是数组，包装成期望的格式
          setTopologyData(normalizeTopologyData(response.data));
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '获取拓扑数据失败';
        logger.error('Failed to fetch topology data:', err);
        setError(errorMessage);

        // 使用模拟数据作为后备
        setTopologyData(getMockTopologyData());
      } finally {
        setIsLoading(false);
      }

      // 保持统计状态（当前版本统计恒为 0，保留结构便于后续扩展）
      setStatistics(createEmptyStatistics());
    },
    [customerId]
  );

  // 数据就绪后创建网络实例（此时容器已渲染，containerRef 可用）
  useEffect(() => {
    if (!topologyData) {
      return;
    }
    processTopologyData(topologyData);
  }, [topologyData, processTopologyData]);

  // 卸载时销毁网络实例
  useEffect(() => {
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, []);

  return {
    containerRef,
    isLoading,
    error,
    statistics,
    loadData
  };
};
