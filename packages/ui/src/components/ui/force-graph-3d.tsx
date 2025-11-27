import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import ForceGraph3DLib from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';

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
  const fgRef = useRef<ForceGraphMethods>();

  useImperativeHandle(ref, () => ({
    d3Force: (forceName: string, force?: any) => {
      if (!fgRef.current) return null;
      return fgRef.current.d3Force(forceName, force);
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
      fgRef.current.centerAt(x, y, transitionDuration);
    },
    zoom: (distance, transitionDuration) => {
      if (!fgRef.current) return;
      fgRef.current.zoom(distance, transitionDuration);
    },
    zoomToFit: (duration, padding, ...filters) => {
      if (!fgRef.current) return;
      fgRef.current.zoomToFit(duration, padding, ...filters);
    },
  }));

  return (
    <div className={className}>
      <ForceGraph3DLib
        ref={fgRef}
        graphData={graphData}
        backgroundColor={backgroundColor}
        nodeLabel={nodeLabel}
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
      />
    </div>
  );
});

ForceGraph3D.displayName = 'ForceGraph3D';
