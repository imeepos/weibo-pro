import React, { useRef, useEffect } from 'react';
import type { UserRelationNetwork, UserRelationNode } from '@sker/sdk';
import { ForceGraph3D, type ForceGraph3DHandle } from '@sker/ui/components/ui/force-graph-3d';
import { useCommunityDetectorWorker } from '@/hooks/useCommunityDetectorWorker';
import { useTheme } from '@/hooks/useTheme';
import * as d3Force from 'd3-force-3d';

interface UserRelationGraph3DOffscreenProps {
  network: UserRelationNetwork;
  className?: string;
  onNodeClick?: (node: UserRelationNode) => void;
  onNodeHover?: (node: UserRelationNode) => void;
  edgeThreshold?: number;
}

export const UserRelationGraph3DOffscreen: React.FC<UserRelationGraph3DOffscreenProps> = ({
  network,
  className = '',
  onNodeClick,
  onNodeHover,
}) => {
  const { isDark } = useTheme();
  const graphRef = useRef<ForceGraph3DHandle>(null);
  const { detect, isDetecting, graphData } = useCommunityDetectorWorker();

  useEffect(() => {
    if (network.nodes.length > 0 && network.edges.length > 0) {
      detect(network.nodes, network.edges);
    }
  }, [network, detect]);

  useEffect(() => {
    if (!graphData) return;

    setTimeout(() => {
      if (!graphRef.current) return;

      graphRef.current.d3Force('radial', d3Force.forceRadial(600, 0, 0, 0).strength(0.3));
      graphRef.current.d3Force('charge', d3Force.forceManyBody().strength(-150));

      const linkForce = graphRef.current.d3Force('link');
      if (linkForce) {
        linkForce.distance(30).strength(0.1);
      }
    }, 100);
  }, [graphData]);

  return (
    <div className={`relative ${className}`}>
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData || { nodes: [], links: [] }}
        backgroundColor={isDark ? 'rgba(10, 10, 15, 1)' : 'rgba(249, 250, 251, 1)'}
        nodeLabel={(node: any) => node.name}
        nodeAutoColorBy="color"
        nodeOpacity={0.9}
        linkOpacity={isDark ? 0.3 : 0.2}
        linkWidth={(link: any) => Math.max(0.5, (link.value || 1) * 0.5)}
        onNodeClick={(node: any) => onNodeClick?.(node as any)}
        onNodeHover={(node: any) => onNodeHover?.(node as any)}
        enableNodeDrag={true}
        enableNavigationControls={true}
        warmupTicks={100}
        cooldownTicks={200}
      />

      {isDetecting && (
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm text-foreground px-3 py-2 text-xs rounded-lg shadow-lg border border-border">
          <div className="flex items-center gap-2">
            <div className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>加载中...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRelationGraph3DOffscreen;
