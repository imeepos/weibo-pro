import { ForceGraph3D } from '@sker/ui/components/ui/force-graph-3d';
import { useForceGraphNodeRenderer } from '@sker/ui/components/ui/use-force-graph-node-renderer';
import { useForceGraphLinkRenderer } from '@sker/ui/components/ui/use-force-graph-link-renderer';
import { useState } from 'react';
import { generateSampleData, generateLargeData, nodeColors, shapeMap } from './data';

export const InteractiveHighlightRender = () => {
  const graphData = generateSampleData();
  const [highlightNodes, setHighlightNodes] = useState<Set<string | number>>(new Set());
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes,
    getNodeShape: (node: any) => shapeMap[node.type] || 'sphere',
    getNodeColor: (node: any) => nodeColors[node.type] || '#6b7280',
  });

  const { linkMaterial, linkWidth, linkDirectionalParticles } = useForceGraphLinkRenderer({
    getLinkColor: () => '#6b7280',
  });

  return (
    <div className="relative w-screen h-screen bg-black">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(node: any) => `
          <div style="background: rgba(0,0,0,0.9); color: white; padding: 8px 12px; border-radius: 6px; font-size: 14px;">
            <div style="font-weight: bold;">${node.name}</div>
            <div style="font-size: 12px; color: #999;">类型: ${node.type}</div>
          </div>
        `}
        nodeThreeObject={nodeThreeObject}
        linkMaterial={linkMaterial}
        linkWidth={linkWidth}
        linkDirectionalParticles={linkDirectionalParticles}
        onNodeClick={(node) => {
          setSelectedNode(node);
          const neighbors = new Set<string | number>();
          neighbors.add(node.id);

          graphData.links.forEach(link => {
            if (link.source === node.id) neighbors.add(link.target);
            if (link.target === node.id) neighbors.add(link.source);
          });

          setHighlightNodes(neighbors);
        }}
        onNodeHover={(node) => {
          if (node && !selectedNode) {
            setHighlightNodes(new Set([node.id]));
          } else if (!node && !selectedNode) {
            setHighlightNodes(new Set());
          }
        }}
      />

      {selectedNode && (
        <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur">
          <h3 className="text-lg font-bold mb-2">{selectedNode.name}</h3>
          <div className="space-y-1 text-sm">
            <div>类型: {selectedNode.type}</div>
            <div>大小: {selectedNode.val.toFixed(2)}</div>
            <div>ID: {selectedNode.id}</div>
          </div>
          <button
            className="mt-3 px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
            onClick={() => {
              setSelectedNode(null);
              setHighlightNodes(new Set());
            }}
          >
            清除选择
          </button>
        </div>
      )}
    </div>
  );
};

export const DifferentShapesRender = () => {
  const graphData = generateSampleData();

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes: new Set(),
    getNodeShape: (node: any) => {
      const shapes = ['sphere', 'cube', 'cylinder', 'dodecahedron'] as const;
      return shapes[parseInt(node.id) % 4] ?? 'sphere';
    },
    getNodeColor: (node: any) => {
      const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
      return colors[parseInt(node.id) % 4] ?? '#6b7280';
    },
    enableWireframe: true,
    enableGlow: true,
  });

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-gray-900 to-black">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(node: any) => `${node.name} (形状示例)`}
        nodeThreeObject={nodeThreeObject}
      />

      <div className="absolute top-4 left-4 bg-black/60 text-white p-4 rounded-lg backdrop-blur">
        <h3 className="font-bold mb-2">节点形状说明</h3>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>球体 (Sphere)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500"></div>
            <span>立方体 (Cube)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>圆柱体 (Cylinder)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
            <span>十二面体 (Dodecahedron)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ColorfulLinksRender = () => {
  const graphData = generateSampleData();

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes: new Set(),
    getNodeColor: () => '#ffffff',
  });

  const { linkMaterial, linkWidth, linkDirectionalParticles } = useForceGraphLinkRenderer({
    getLinkColor: (link: any) => {
      const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'];
      return colors[Math.floor(link.value) % colors.length] ?? '#6b7280';
    },
  });

  return (
    <div className="w-screen h-screen bg-black">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(node: any) => node.name}
        nodeThreeObject={nodeThreeObject}
        linkMaterial={linkMaterial}
        linkWidth={linkWidth}
        linkDirectionalParticles={linkDirectionalParticles}
        linkDirectionalParticleWidth={3}
        linkDirectionalParticleSpeed={0.01}
      />
    </div>
  );
};

export const LargeGraphRender = () => {
  const graphData = generateLargeData();

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes: new Set(),
    getNodeColor: (node: any) => nodeColors[node.type] || '#6b7280',
    enableWireframe: false,
    enableGlow: false,
  });

  const { linkMaterial, linkWidth } = useForceGraphLinkRenderer({
    getLinkColor: () => '#444',
  });

  return (
    <div className="relative w-screen h-screen bg-gradient-to-br from-purple-900/20 to-blue-900/20 bg-black">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(node: any) => node.name}
        nodeThreeObject={nodeThreeObject}
        linkMaterial={linkMaterial}
        linkWidth={linkWidth}
        linkOpacity={0.2}
      />

      <div className="absolute top-4 right-4 bg-black/60 text-white p-4 rounded-lg backdrop-blur">
        <div className="text-sm space-y-1">
          <div>节点数: {graphData.nodes.length}</div>
          <div>连线数: {graphData.links.length}</div>
        </div>
      </div>
    </div>
  );
};

export const OpacityVariationRender = () => {
  const graphData = generateSampleData();

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes: new Set(),
    getNodeColor: () => '#3b82f6',
    getNodeOpacity: (node: any) => {
      return 0.3 + (parseInt(node.id) / 10) * 0.7;
    },
  });

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-blue-900/20 to-purple-900/20 bg-black">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(node: any) => `${node.name} (透明度: ${(0.3 + (parseInt(node.id) / 10) * 0.7).toFixed(2)})`}
        nodeThreeObject={nodeThreeObject}
      />
    </div>
  );
};
