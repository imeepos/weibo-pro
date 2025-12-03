import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { DataSet } from 'vis-data';
import { cn } from '@sker/ui/lib/utils';

// 使用 any 类型来绕过 vis-network 的类型导出问题
// 运行时通过动态导入获取实际的 Network 类
type Network = any;
type Options = any;

export interface NetworkNode {
  id: string | number;
  label?: string;
  color?: { background: string; border: string } | string;
  size?: number;
  shape?: string;
  [key: string]: any;
}

export interface NetworkEdge {
  id: string | number;
  from: string | number;
  to: string | number;
  color?: { color: string } | string;
  width?: number;
  [key: string]: any;
}

export interface NetworkGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface NetworkGraphProps {
  data: NetworkGraphData | null;
  options?: Options;
  className?: string;
  style?: React.CSSProperties;
  onNodeClick?: (nodeId: string | number) => void;
  onStabilized?: () => void;
}

export interface NetworkGraphRef {
  fit: () => void;
  destroy: () => void;
  getNetwork: () => Network | null;
}

export const NetworkGraph = forwardRef<NetworkGraphRef, NetworkGraphProps>(
  ({ data, options, className, style, onNodeClick, onStabilized }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const networkRef = useRef<Network | null>(null);

    useImperativeHandle(ref, () => ({
      fit: () => networkRef.current?.fit(),
      destroy: () => {
        networkRef.current?.destroy();
        networkRef.current = null;
      },
      getNetwork: () => networkRef.current
    }));

    useEffect(() => {
      if (!containerRef.current || !data) return;

      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }

      // 动态导入 vis-network 以获取运行时值
      let mounted = true;

      import('vis-network').then((visModule) => {
        if (!mounted || !containerRef.current) return;

        try {
          const nodes = new DataSet(data.nodes);
          const edges = new DataSet(data.edges);

          // vis-network 使用默认导出
          const vis = (visModule as any).default || visModule;
          networkRef.current = new vis.Network(
            containerRef.current,
            { nodes, edges },
            options
          );

          if (onNodeClick) {
            networkRef.current.on('click', (params: any) => {
              if (params.nodes.length > 0) {
                onNodeClick(params.nodes[0]);
              }
            });
          }

          if (onStabilized) {
            networkRef.current.once('stabilizationIterationsDone', onStabilized);
          }
        } catch (error) {
          console.error('Network initialization failed:', error);
        }
      });

      return () => {
        mounted = false;
        if (networkRef.current) {
          networkRef.current.destroy();
          networkRef.current = null;
        }
      };
    }, [data, options, onNodeClick, onStabilized]);

    return (
      <div
        ref={containerRef}
        className={cn('w-full', className)}
        style={style}
      />
    );
  }
);

NetworkGraph.displayName = 'NetworkGraph';
