import type { Meta, StoryObj } from '@storybook/react';
import { ForceGraph3D } from '@sker/ui/components/ui/force-graph-3d';
import { useForceGraphNodeRenderer } from '@sker/ui/components/ui/use-force-graph-node-renderer';
import { useForceGraphLinkRenderer } from '@sker/ui/components/ui/use-force-graph-link-renderer';
import { useState } from 'react';

const meta = {
  title: 'Charts/ForceGraph Renderers',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const generateSampleData = () => {
  const nodes = [
    { id: '1', name: '中心', val: 10, importance: 100, lastActive: new Date().toISOString() },
    { id: '2', name: '节点A', val: 5, importance: 80, lastActive: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', name: '节点B', val: 7, importance: 90, lastActive: new Date(Date.now() - 604800000).toISOString() },
    { id: '4', name: '节点C', val: 4, importance: 60, lastActive: new Date(Date.now() - 2592000000).toISOString() },
    { id: '5', name: '节点D', val: 6, importance: 75, lastActive: new Date().toISOString() },
    { id: '6', name: '节点E', val: 3, importance: 50, lastActive: new Date(Date.now() - 86400000 * 7).toISOString() },
  ];

  const links = [
    { source: '1', target: '2', value: 10, type: 'strong' },
    { source: '1', target: '3', value: 15, type: 'strong' },
    { source: '1', target: '4', value: 8, type: 'weak' },
    { source: '2', target: '5', value: 12, type: 'medium' },
    { source: '3', target: '6', value: 6, type: 'weak' },
    { source: '4', target: '6', value: 9, type: 'medium' },
  ];

  return { nodes, links };
};

export const NodeShapeVariations: Story = {
  render: () => {
    const graphData = generateSampleData();

    const shapes = ['sphere', 'cube', 'cylinder', 'dodecahedron'] as const;
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];

    const { nodeThreeObject } = useForceGraphNodeRenderer({
      highlightNodes: new Set(),
      getNodeShape: (node: any) => shapes[(parseInt(node.id) - 1) % 4] ?? 'sphere',
      getNodeColor: (node: any) => colors[(parseInt(node.id) - 1) % colors.length] ?? '#6b7280',
      enableWireframe: true,
      enableGlow: true,
    });

    return (
      <div className="relative w-screen h-screen bg-gradient-to-br from-slate-900 to-black">
        <ForceGraph3D
          graphData={graphData}
          nodeLabel={(node: any) => `${node.name} - ${shapes[(parseInt(node.id) - 1) % 4]}`}
          nodeThreeObject={nodeThreeObject}
        />

        <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur">
          <h3 className="text-lg font-bold mb-3">节点形状编码</h3>
          <div className="space-y-2 text-sm">
            {shapes.map((shape, idx) => (
              <div key={shape} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: colors[idx] }}></div>
                <span className="capitalize">{shape}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
};

export const NodeOpacityByActivity: Story = {
  render: () => {
    const graphData = generateSampleData();

    const { nodeThreeObject } = useForceGraphNodeRenderer({
      highlightNodes: new Set(),
      getNodeColor: () => '#3b82f6',
      getNodeOpacity: (node: any) => {
        if (!node.lastActive) return 1.0;
        const daysSinceActive = Math.floor((Date.now() - new Date(node.lastActive).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceActive <= 1) return 1.0;
        if (daysSinceActive <= 7) return 0.8;
        if (daysSinceActive <= 30) return 0.6;
        return 0.3;
      },
    });

    return (
      <div className="relative w-screen h-screen bg-black">
        <ForceGraph3D
          graphData={graphData}
          nodeLabel={(node: any) => {
            const daysSinceActive = Math.floor((Date.now() - new Date(node.lastActive).getTime()) / (1000 * 60 * 60 * 24));
            return `${node.name} - ${daysSinceActive}天前活跃`;
          }}
          nodeThreeObject={nodeThreeObject}
        />

        <div className="absolute top-4 right-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur">
          <h3 className="text-lg font-bold mb-3">活跃度透明度编码</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>1天内 - 100% 透明度</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500/80 rounded-full"></div>
              <span>7天内 - 80% 透明度</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500/60 rounded-full"></div>
              <span>30天内 - 60% 透明度</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500/30 rounded-full"></div>
              <span>30天+ - 30% 透明度</span>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export const PulseAnimationConfig: Story = {
  render: () => {
    const graphData = generateSampleData();

    const { nodeThreeObject } = useForceGraphNodeRenderer({
      highlightNodes: new Set(),
      getNodeColor: (node: any) => {
        const importance = node.importance || 50;
        if (importance >= 90) return '#ef4444';
        if (importance >= 75) return '#f59e0b';
        if (importance >= 60) return '#3b82f6';
        return '#6b7280';
      },
      enablePulse: true,
      pulseFrequency: 1.5,
      pulseAmplitude: 0.15,
    });

    return (
      <div className="relative w-screen h-screen bg-gradient-to-br from-purple-900/30 to-black">
        <ForceGraph3D
          graphData={graphData}
          nodeLabel={(node: any) => `${node.name} - 重要度: ${node.importance}`}
          nodeThreeObject={nodeThreeObject}
        />

        <div className="absolute bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur">
          <h3 className="text-lg font-bold mb-3">脉动动画配置</h3>
          <div className="space-y-2 text-sm">
            <div>频率: 1.5 Hz</div>
            <div>振幅: 15%</div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>高重要度 (90+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>中高 (75-89)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>中等 (60-74)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span>低 (60)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export const LinkColorByType: Story = {
  render: () => {
    const graphData = generateSampleData();

    const { nodeThreeObject } = useForceGraphNodeRenderer({
      highlightNodes: new Set(),
      getNodeColor: () => '#ffffff',
    });

    const linkColors: Record<string, string> = {
      strong: '#ef4444',
      medium: '#f59e0b',
      weak: '#6b7280',
    };

    const { linkMaterial, linkWidth, linkDirectionalParticles } = useForceGraphLinkRenderer({
      getLinkColor: (link: any) => linkColors[link.type] || '#6b7280',
      getLinkWidth: (link: any) => {
        if (link.type === 'strong') return 4;
        if (link.type === 'medium') return 2;
        return 1;
      },
    });

    return (
      <div className="relative w-screen h-screen bg-black">
        <ForceGraph3D
          graphData={graphData}
          nodeLabel={(node: any) => node.name}
          nodeThreeObject={nodeThreeObject}
          linkMaterial={linkMaterial}
          linkWidth={linkWidth}
          linkDirectionalParticles={linkDirectionalParticles}
        />

        <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur">
          <h3 className="text-lg font-bold mb-3">连线类型编码</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-1 bg-red-500"></div>
              <span>强连接 (粗)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-0.5 bg-orange-500"></div>
              <span>中等连接</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-px bg-gray-500"></div>
              <span>弱连接 (细)</span>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export const LinkParticleAnimation: Story = {
  render: () => {
    const graphData = generateSampleData();

    const { nodeThreeObject } = useForceGraphNodeRenderer({
      highlightNodes: new Set(),
      getNodeColor: () => '#3b82f6',
    });

    const { linkMaterial, linkWidth, linkDirectionalParticles, linkDirectionalParticleWidth, linkDirectionalParticleSpeed } = useForceGraphLinkRenderer({
      getLinkColor: (link: any) => '#a855f7',
      getLinkParticles: (link: any) => {
        return Math.min(10, Math.max(3, link.value / 2));
      },
      getLinkParticleWidth: (link: any) => {
        return Math.max(2, link.value / 5);
      },
      getLinkParticleSpeed: (link: any) => {
        return Math.max(0.005, Math.min(0.02, 0.005 + link.value / 1000));
      },
    });

    return (
      <div className="relative w-screen h-screen bg-gradient-to-br from-indigo-900/20 to-black">
        <ForceGraph3D
          graphData={graphData}
          nodeLabel={(node: any) => node.name}
          nodeThreeObject={nodeThreeObject}
          linkMaterial={linkMaterial}
          linkWidth={linkWidth}
          linkDirectionalParticles={linkDirectionalParticles}
          linkDirectionalParticleWidth={linkDirectionalParticleWidth}
          linkDirectionalParticleSpeed={linkDirectionalParticleSpeed}
        />

        <div className="absolute top-4 right-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur">
          <h3 className="text-lg font-bold mb-3">粒子动画配置</h3>
          <div className="space-y-2 text-sm">
            <div>粒子数量: 基于连线权重</div>
            <div>粒子大小: 2-3 像素</div>
            <div>粒子速度: 0.005-0.02</div>
            <div className="text-xs text-gray-400 mt-2">
              权重越大，粒子越多、越大、越快
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export const WireframeAndGlowEffects: Story = {
  render: () => {
    const graphData = generateSampleData();
    const [showWireframe, setShowWireframe] = useState(true);
    const [showGlow, setShowGlow] = useState(true);

    const { nodeThreeObject } = useForceGraphNodeRenderer({
      highlightNodes: new Set(),
      getNodeColor: () => '#10b981',
      enableWireframe: showWireframe,
      enableGlow: showGlow,
    });

    return (
      <div className="relative w-screen h-screen bg-black">
        <ForceGraph3D
          graphData={graphData}
          nodeLabel={(node: any) => node.name}
          nodeThreeObject={nodeThreeObject}
        />

        <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur">
          <h3 className="text-lg font-bold mb-3">视觉效果控制</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showWireframe}
                onChange={(e) => setShowWireframe(e.target.checked)}
                className="w-4 h-4"
              />
              <span>线框效果</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showGlow}
                onChange={(e) => setShowGlow(e.target.checked)}
                className="w-4 h-4"
              />
              <span>发光效果</span>
            </label>
          </div>
        </div>
      </div>
    );
  },
};

export const HighlightEffect: Story = {
  render: () => {
    const graphData = generateSampleData();
    const [highlightNodes, setHighlightNodes] = useState<Set<string | number>>(new Set(['1', '2']));

    const { nodeThreeObject } = useForceGraphNodeRenderer({
      highlightNodes,
      getNodeColor: (node: any) => highlightNodes.has(node.id) ? '#ef4444' : '#3b82f6',
    });

    const toggleNode = (nodeId: string) => {
      setHighlightNodes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        return newSet;
      });
    };

    return (
      <div className="relative w-screen h-screen bg-black">
        <ForceGraph3D
          graphData={graphData}
          nodeLabel={(node: any) => node.name}
          nodeThreeObject={nodeThreeObject}
          onNodeClick={(node) => toggleNode(node.id.toString())}
        />

        <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur">
          <h3 className="text-lg font-bold mb-3">高亮节点控制</h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-400 mb-3">点击节点切换高亮状态</p>
            {graphData.nodes.map(node => (
              <button
                key={node.id}
                onClick={() => toggleNode(node.id)}
                className={`block w-full text-left px-3 py-1.5 rounded transition-colors ${
                  highlightNodes.has(node.id)
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {node.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  },
};

export const CombinedEffects: Story = {
  render: () => {
    const graphData = generateSampleData();
    const [highlightNodes, setHighlightNodes] = useState<Set<string | number>>(new Set());

    const { nodeThreeObject } = useForceGraphNodeRenderer({
      highlightNodes,
      getNodeShape: (node: any) => {
        const shapes = ['sphere', 'cube', 'cylinder', 'dodecahedron'] as const;
        return shapes[(parseInt(node.id) - 1) % 4] ?? 'sphere';
      },
      getNodeColor: (node: any) => {
        if (highlightNodes.has(node.id)) return '#ef4444';
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7'];
        return colors[(parseInt(node.id) - 1) % 4] ?? '#6b7280';
      },
      getNodeOpacity: (node: any) => {
        if (highlightNodes.has(node.id)) return 1.0;
        const daysSinceActive = Math.floor((Date.now() - new Date(node.lastActive).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceActive <= 1) return 1.0;
        if (daysSinceActive <= 7) return 0.8;
        return 0.5;
      },
      enablePulse: true,
      pulseFrequency: 1,
      pulseAmplitude: 0.1,
      enableWireframe: true,
      enableGlow: true,
    });

    const { linkMaterial, linkWidth, linkDirectionalParticles } = useForceGraphLinkRenderer({
      getLinkColor: (link: any) => {
        const colors: Record<string, string> = {
          strong: '#ef4444',
          medium: '#f59e0b',
          weak: '#6b7280',
        };
        return colors[link.type] || '#6b7280';
      },
      getLinkWidth: (link: any) => Math.max(1, link.value / 5),
    });

    return (
      <div className="relative w-screen h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-black">
        <ForceGraph3D
          graphData={graphData}
          nodeLabel={(node: any) => `
            <div style="background: rgba(0,0,0,0.95); color: white; padding: 10px; border-radius: 8px; font-size: 13px; max-width: 200px;">
              <div style="font-weight: bold; margin-bottom: 6px; color: #60a5fa;">${node.name}</div>
              <div style="font-size: 11px; color: #9ca3af;">重要度: ${node.importance}</div>
              <div style="font-size: 11px; color: #9ca3af;">最后活跃: ${new Date(node.lastActive).toLocaleDateString()}</div>
            </div>
          `}
          nodeThreeObject={nodeThreeObject}
          linkMaterial={linkMaterial}
          linkWidth={linkWidth}
          linkDirectionalParticles={linkDirectionalParticles}
          onNodeHover={(node) => {
            if (node) {
              const neighbors = new Set<string | number>();
              neighbors.add(node.id);
              graphData.links.forEach(link => {
                if (link.source === node.id) neighbors.add(link.target);
                if (link.target === node.id) neighbors.add(link.source);
              });
              setHighlightNodes(neighbors);
            } else {
              setHighlightNodes(new Set());
            }
          }}
        />

        <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur max-w-xs">
          <h3 className="text-lg font-bold mb-3">综合效果演示</h3>
          <div className="space-y-2 text-xs">
            <div className="border-l-2 border-blue-500 pl-3">
              <div className="font-semibold text-blue-400">节点渲染</div>
              <div className="text-gray-400">形状编码 + 颜色编码 + 透明度 + 脉动 + 高亮</div>
            </div>
            <div className="border-l-2 border-purple-500 pl-3">
              <div className="font-semibold text-purple-400">连线渲染</div>
              <div className="text-gray-400">类型颜色 + 动态宽度 + 粒子动画</div>
            </div>
            <div className="border-l-2 border-green-500 pl-3">
              <div className="font-semibold text-green-400">交互效果</div>
              <div className="text-gray-400">悬停高亮 + 邻居显示 + Tooltip</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-400">
            悬停节点查看连接关系
          </div>
        </div>
      </div>
    );
  },
};
