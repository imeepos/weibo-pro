import { ForceGraph3D, type ForceGraph3DHandle } from '@sker/ui/components/ui/force-graph-3d';
import { useForceGraphNodeRenderer } from '@sker/ui/components/ui/use-force-graph-node-renderer';
import { useForceGraphLinkRenderer } from '@sker/ui/components/ui/use-force-graph-link-renderer';
import { useState, useRef } from 'react';
import { generateSampleData, nodeColors, shapeMap } from './data';

export const BasicRender = () => {
  const graphData = generateSampleData();

  return (
    <div className="w-screen h-screen bg-black">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(node: any) => node.name}
      />
    </div>
  );
};

export const WithCustomRenderersRender = () => {
  const graphData = generateSampleData();
  const [highlightNodes, setHighlightNodes] = useState<Set<string | number>>(new Set());

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes,
    getNodeShape: (node: any) => shapeMap[node.type] || 'sphere',
    getNodeColor: (node: any) => nodeColors[node.type] || '#6b7280',
    enablePulse: false,
  });

  const { linkMaterial, linkWidth } = useForceGraphLinkRenderer({
    getLinkColor: () => '#6b7280',
  });

  return (
    <div className="w-screen h-screen bg-black">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(node: any) => node.name}
        nodeThreeObject={nodeThreeObject}
        linkMaterial={linkMaterial}
        linkWidth={linkWidth}
        onNodeHover={(node) => {
          if (node) {
            setHighlightNodes(new Set([node.id]));
          } else {
            setHighlightNodes(new Set());
          }
        }}
      />
    </div>
  );
};

export const WithPulseAnimationRender = () => {
  const graphData = generateSampleData();

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes: new Set(),
    getNodeColor: () => '#3b82f6',
    enablePulse: true,
    pulseFrequency: 1,
    pulseAmplitude: 0.2,
  });

  return (
    <div className="w-screen h-screen bg-black">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(node: any) => node.name}
        nodeThreeObject={nodeThreeObject}
      />
    </div>
  );
};

export const WithCameraControlRender = () => {
  const graphData = generateSampleData();
  const fgRef = useRef<ForceGraph3DHandle>(null);

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes: new Set(),
    getNodeColor: () => '#3b82f6',
  });

  const handleZoomIn = () => {
    if (fgRef.current) {
      fgRef.current.zoom(200, 1000);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      fgRef.current.zoom(800, 1000);
    }
  };

  const handleCenter = () => {
    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: 0, y: 0, z: 400 },
        { x: 0, y: 0, z: 0 },
        1000
      );
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={(node: any) => node.name}
        nodeThreeObject={nodeThreeObject}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-lg p-2 flex gap-2">
        <button
          onClick={handleZoomIn}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          放大
        </button>
        <button
          onClick={handleZoomOut}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          缩小
        </button>
        <button
          onClick={handleCenter}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          居中
        </button>
      </div>
    </div>
  );
};
