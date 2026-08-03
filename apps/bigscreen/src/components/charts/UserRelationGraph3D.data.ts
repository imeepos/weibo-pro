import * as THREE from 'three';
import type { UserRelationNetwork } from '@sker/sdk';
import {
  createSamplingStrategy,
  type PerformanceConfig,
} from '@sker/ui/lib/graph-performance-optimizer';
import {
  calculateCompositeScore,
  calculateConnectionCounts,
  calculateNodeSize,
  type NodeSizeWeights,
} from './NodeSizeCalculator';
import { getRenderData, LAYER_THRESHOLDS } from './LayeredRenderer';
import { getEdgeColor, getEdgeOpacity } from './UserRelationGraph3D.utils';
import { sanitizeUserRelationNetwork } from './UserRelationGraph3D.sanitize';

export interface GraphDataResult {
  nodes: any[];
  links: any[];
  backgroundNodes: any[];
}

/** 将渲染边映射为力导向图链接格式 */
function mapEdgesToLinks(edges: any[]): any[] {
  return edges.map(edge => ({
    source: edge.source,
    target: edge.target,
    value: edge.weight,
    type: edge.type,
  }));
}

/**
 * 构建力导向图渲染数据：
 * 1. 计算连接数与综合影响力得分
 * 2. 应用分层渲染策略
 * 3. 在节点过多时应用性能采样
 */
export function buildGraphData(
  network: UserRelationNetwork,
  currentWeights: NodeSizeWeights,
  performanceConfig: PerformanceConfig,
  showDebugHud: boolean
): GraphDataResult {
  const startTime = performance.now();

  const { nodes: processedNodes, edges: processedEdges } = sanitizeUserRelationNetwork(network);

  // 性能监控：记录原始数据量
  if (showDebugHud) {
    console.log(`📊 图数据处理开始: ${processedNodes.length} 节点, ${processedEdges.length} 边`);
  }

  // 计算连接数和综合得分
  const connectionCountMap = calculateConnectionCounts(processedEdges);
  const nodesWithScores = processedNodes.map(node => {
    const connectionCount = connectionCountMap.get(node.id.toString()) || 0;
    const compositeScore = calculateCompositeScore(node, connectionCount, currentWeights);
    const nodeSize = calculateNodeSize(compositeScore);

    return {
      ...node,
      connectionCount,
      compositeScore,
      val: nodeSize,
    };
  });

  // 应用分层渲染策略
  const renderData = getRenderData(nodesWithScores, processedEdges, 'compositeScore');

  // 应用性能优化采样（仅在分层后仍然节点过多时）
  let finalData: GraphDataResult;
  if (performanceConfig.enableSampling && renderData.nodes.length > LAYER_THRESHOLDS.CORE) {
    const sampled = createSamplingStrategy(
      renderData.nodes,
      renderData.edges,
      performanceConfig,
      (a: any, b: any) => (b.compositeScore || 0) - (a.compositeScore || 0)
    );
    finalData = {
      nodes: sampled.nodes,
      links: mapEdgesToLinks(sampled.edges),
      backgroundNodes: renderData.backgroundNodes || [],
    };
  } else {
    finalData = {
      nodes: renderData.nodes,
      links: mapEdgesToLinks(renderData.edges),
      backgroundNodes: renderData.backgroundNodes || [],
    };
  }

  // 性能监控：记录处理时间
  const duration = performance.now() - startTime;
  if (showDebugHud) {
    console.log(`✅ 图数据处理完成: ${finalData.nodes.length} 节点 (耗时 ${duration.toFixed(1)}ms)`);
  }
  if (duration > 500) {
    console.warn(`⚠️ 图数据处理耗时过长: ${duration.toFixed(0)}ms`);
  }

  return finalData;
}

/** 创建边的材质（按权重/类型着色） */
export function createLinkMaterial(link: any): THREE.MeshBasicMaterial {
  const weight = link.value || 1;
  const opacity = getEdgeOpacity(weight);
  const color = getEdgeColor(link.type);
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
  });
}

/** 根据边的权重计算线宽 */
export function createLinkWidth(link: any): number {
  const weight = link.value || 1;
  const normalizedWeight = Math.min(weight / 100, 1);
  return 0.5 + normalizedWeight * 3;
}
