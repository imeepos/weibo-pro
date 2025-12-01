import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import ForceGraph3DLib from 'react-force-graph-3d';
import type { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-3d';

export interface GraphNode {
  id: string | number;
  val?: number;
  [key: string]: any;
}

export interface GraphLink {
  source: string | number;
  target: string | number;
  value?: number;
  [key: string]: any;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ForceGraph3DProps {
  graphData: GraphData;
  className?: string;
  backgroundColor?: string;
  nodeLabel?: (node: GraphNode) => string;
  nodeThreeObject?: (node: GraphNode) => any;
  nodeAutoColorBy?: string;
  nodeOpacity?: number;
  linkMaterial?: (link: GraphLink) => any;
  linkWidth?: (link: GraphLink) => number;
  linkOpacity?: number;
  linkCurvature?: number;
  linkDirectionalParticles?: number | ((link: GraphLink) => number);
  linkDirectionalParticleWidth?: number | ((link: GraphLink) => number);
  linkDirectionalParticleSpeed?: number | ((link: GraphLink) => number);
  onNodeClick?: (node: GraphNode, event?: MouseEvent) => void;
  onNodeHover?: (node: GraphNode | null, previousNode?: GraphNode | null) => void;
  onLinkClick?: (link: GraphLink, event?: MouseEvent) => void;
  onLinkHover?: (link: GraphLink | null, previousLink?: GraphLink | null) => void;
  showNavInfo?: boolean;
  controlType?: 'trackball' | 'orbit' | 'fly';
  enableNodeDrag?: boolean;
  enableNavigationControls?: boolean;
  enablePointerInteraction?: boolean;
  onEngineStop?: () => void;
}

export interface ForceGraph3DHandle {
  d3Force: (forceName: string, force?: any) => any;
  cameraPosition: (position: { x: number; y: number; z: number }, lookAt?: { x: number; y: number; z: number }, transitionDuration?: number) => void;
  refresh: () => void;
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  centerAt: (x?: number, y?: number, transitionDuration?: number) => void;
  zoom: (distance: number, transitionDuration?: number) => void;
  zoomToFit: (duration?: number, padding?: number, ...filters: any[]) => void;
}

export const ForceGraph3D = forwardRef<ForceGraph3DHandle, ForceGraph3DProps>(({
  graphData,
  className = '',
  backgroundColor = 'rgba(0, 0, 0, 0)',
  nodeLabel,
  nodeThreeObject,
  nodeAutoColorBy,
  nodeOpacity = 0.9,
  linkMaterial,
  linkWidth,
  linkOpacity = 0.4,
  linkCurvature = 0.1,
  linkDirectionalParticles,
  linkDirectionalParticleWidth,
  linkDirectionalParticleSpeed,
  onNodeClick,
  onNodeHover,
  onLinkClick,
  onLinkHover,
  showNavInfo = false,
  controlType = 'orbit',
  enableNodeDrag = true,
  enableNavigationControls = true,
  enablePointerInteraction = true,
  onEngineStop,
}, ref) => {
  const fgRef = useRef<ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLink>> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 监听容器尺寸变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    };

    // 初始化尺寸
    updateDimensions();

    // 使用 ResizeObserver 监听尺寸变化
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    d3Force: (forceName: string, force?: any) => {
      if (!fgRef.current) return null;
      return fgRef.current.d3Force(forceName as any, force);
    },
    cameraPosition: (position, lookAt, transitionDuration) => {
      if (!fgRef.current) return;
      fgRef.current.cameraPosition(position, lookAt, transitionDuration);
    },
    refresh: () => {
      if (!fgRef.current) return;
      fgRef.current.refresh();
    },
    pauseAnimation: () => {
      if (!fgRef.current) return;
      fgRef.current.pauseAnimation();
    },
    resumeAnimation: () => {
      if (!fgRef.current) return;
      fgRef.current.resumeAnimation();
    },
    centerAt: (x, y, transitionDuration) => {
      if (!fgRef.current) return;
      // 这里需要实现 centerAt 逻辑
    },
    zoom: (distance, transitionDuration) => {
      if (!fgRef.current) return;
      // 这里需要实现 zoom 逻辑
    },
    zoomToFit: (duration, padding, ...filters) => {
      if (!fgRef.current) return;
      fgRef.current.zoomToFit(duration, padding, ...filters);
    },
  }));

  return (
    <div
      ref={containerRef}
      className={`${className} relative`}
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <ForceGraph3DLib
        ref={fgRef}
        graphData={graphData}
        backgroundColor={backgroundColor}
        nodeLabel={nodeLabel}
        width={dimensions.width}
        height={dimensions.height}
        nodeThreeObject={nodeThreeObject}
        nodeAutoColorBy={nodeAutoColorBy}
        nodeOpacity={nodeOpacity}
        linkMaterial={linkMaterial}
        linkWidth={linkWidth}
        linkOpacity={linkOpacity}
        linkCurvature={linkCurvature}
        linkDirectionalParticles={linkDirectionalParticles}
        linkDirectionalParticleWidth={linkDirectionalParticleWidth}
        linkDirectionalParticleSpeed={linkDirectionalParticleSpeed}
        onNodeClick={onNodeClick}
        onNodeHover={onNodeHover}
        onLinkClick={onLinkClick}
        onLinkHover={onLinkHover}
        showNavInfo={showNavInfo}
        controlType={controlType}
        enableNodeDrag={enableNodeDrag}
        enableNavigationControls={enableNavigationControls}
        enablePointerInteraction={enablePointerInteraction}
        onEngineStop={onEngineStop}
        cooldownTicks={50}
        d3AlphaDecay={0.05}
        d3VelocityDecay={0.4}
        rendererConfig={{
          antialias: false,
          powerPreference: 'high-performance',
          precision: 'lowp'
        }}
      />
    </div>
  );
});

ForceGraph3D.displayName = 'ForceGraph3D';
