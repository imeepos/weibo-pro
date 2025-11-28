import type { Meta, StoryObj } from '@storybook/react';
import { ForceGraph3D, type ForceGraph3DHandle } from '@sker/ui/components/ui/force-graph-3d';
import { useForceGraphNodeRenderer } from '@sker/ui/components/ui/use-force-graph-node-renderer';
import { useForceGraphLinkRenderer } from '@sker/ui/components/ui/use-force-graph-link-renderer';
import { useState, useRef, useEffect } from 'react';

const meta = {
  title: 'Charts/ForceGraph3D',
  component: ForceGraph3D,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    backgroundColor: {
      control: 'color',
      description: '背景颜色',
    },
    controlType: {
      control: 'select',
      options: ['trackball', 'orbit', 'fly'],
      description: '控制类型',
    },
    enableNodeDrag: {
      control: 'boolean',
      description: '是否允许拖拽节点',
    },
    enableNavigationControls: {
      control: 'boolean',
      description: '是否显示导航控制',
    },
    linkCurvature: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: '连线曲率',
    },
  },
} satisfies Meta<typeof ForceGraph3D>;

export default meta;

const generateSampleData = (nodeCount: number = 6) => {
  const nodes = [
    { id: '1', name: '中心节点', val: 10, type: 'official' },
    { id: '2', name: '节点A', val: 5, type: 'media' },
    { id: '3', name: '节点B', val: 7, type: 'kol' },
    { id: '4', name: '节点C', val: 4, type: 'normal' },
    { id: '5', name: '节点D', val: 6, type: 'media' },
    { id: '6', name: '节点E', val: 3, type: 'normal' },
  ];

  const links = [
    { source: '1', target: '2', value: 10 },
    { source: '1', target: '3', value: 15 },
    { source: '1', target: '4', value: 8 },
    { source: '2', target: '5', value: 12 },
    { source: '3', target: '6', value: 6 },
    { source: '4', target: '6', value: 9 },
  ];

  return {
    nodes: nodes.slice(0, nodeCount),
    links: links.filter(l => {
      const sourceIndex = parseInt(l.source) - 1;
      const targetIndex = parseInt(l.target) - 1;
      return sourceIndex < nodeCount && targetIndex < nodeCount;
    })
  };
};

const generateLargeData = () => {
  const nodes = Array.from({ length: 50 }, (_, i) => ({
    id: `${i + 1}`,
    name: `节点${i + 1}`,
    val: Math.random() * 10 + 3,
    type: ['official', 'media', 'kol', 'normal'][Math.floor(Math.random() * 4)],
  }));

  const links = [];
  for (let i = 0; i < 80; i++) {
    const source = Math.floor(Math.random() * 50) + 1;
    const target = Math.floor(Math.random() * 50) + 1;
    if (source !== target) {
      links.push({
        source: `${source}`,
        target: `${target}`,
        value: Math.random() * 20 + 5,
      });
    }
  }

  return { nodes, links };
};

export const Basic = {
  render: () => {
    const graphData = generateSampleData();

    return (
      <div className="w-screen h-screen bg-black">
        <ForceGraph3D
          graphData={graphData}
          nodeLabel={(node: any) => node.name}
        />
      </div>
    );
  },
};

export const WithCustomRenderers = {
  render: () => {
    const graphData = generateSampleData();
    const [highlightNodes, setHighlightNodes] = useState<Set<string | number>>(new Set());

    const nodeColors: Record<string, string> = {
      official: '#ef4444',
      media: '#3b82f6',
      kol: '#a855f7',
      normal: '#10b981',
    };

    const { nodeThreeObject } = useForceGraphNodeRenderer({
      highlightNodes,
      getNodeShape: (node: any) => {
        const shapeMap: Record<string, 'sphere' | 'cube' | 'cylinder' | 'dodecahedron'> = {
          official: 'cube',
          media: 'cylinder',
          kol: 'dodecahedron',
          normal: 'sphere',
        };
        return shapeMap[node.type] || 'sphere';
      },
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
  },
};

export const WithPulseAnimation = {
  render: () => {
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
  },
};

export const InteractiveHighlight = {
  render: () => {
    const graphData = generateSampleData();
    const [highlightNodes, setHighlightNodes] = useState<Set<string | number>>(new Set());
    const [selectedNode, setSelectedNode] = useState<any>(null);

    const nodeColors: Record<string, string> = {
      official: '#ef4444',
      media: '#3b82f6',
      kol: '#a855f7',
      normal: '#10b981',
    };

    const { nodeThreeObject } = useForceGraphNodeRenderer({
      highlightNodes,
      getNodeShape: (node: any) => {
        const shapeMap: Record<string, 'sphere' | 'cube' | 'cylinder' | 'dodecahedron'> = {
          official: 'cube',
          media: 'cylinder',
          kol: 'dodecahedron',
          normal: 'sphere',
        };
        return shapeMap[node.type] || 'sphere';
      },
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
  },
};

export const DifferentShapes = {
  render: () => {
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
  },
};

export const ColorfulLinks = {
  render: () => {
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
  },
};

export const LargeGraph = {
  render: () => {
    const graphData = generateLargeData();

    const nodeColors: Record<string, string> = {
      official: '#ef4444',
      media: '#3b82f6',
      kol: '#a855f7',
      normal: '#10b981',
    };

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
  },
};

export const WithCameraControl = {
  render: () => {
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
  },
};

export const OpacityVariation = {
  render: () => {
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
  },
};
