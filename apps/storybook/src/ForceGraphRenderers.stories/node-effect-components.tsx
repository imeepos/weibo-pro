import { ForceGraph3D } from '@sker/ui/components/ui/force-graph-3d';
import { useForceGraphNodeRenderer } from '@sker/ui/components/ui/use-force-graph-node-renderer';
import { useForceGraphLinkRenderer } from '@sker/ui/components/ui/use-force-graph-link-renderer';
import { useState } from 'react';
import { generateSampleData, nodeShapes, linkColors, daysSinceActive, opacityByDays } from './data';

export const WireframeAndGlowEffectsRender = () => {
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
};

export const HighlightEffectRender = () => {
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
};

export const CombinedEffectsRender = () => {
  const graphData = generateSampleData();
  const [highlightNodes, setHighlightNodes] = useState<Set<string | number>>(new Set());

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes,
    getNodeShape: (node: any) => {
      const shapes = nodeShapes;
      return shapes[(parseInt(node.id) - 1) % 4] ?? 'sphere';
    },
    getNodeColor: (node: any) => {
      if (highlightNodes.has(node.id)) return '#ef4444';
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7'];
      return colors[(parseInt(node.id) - 1) % 4] ?? '#6b7280';
    },
    getNodeOpacity: (node: any) => {
      if (highlightNodes.has(node.id)) return 1.0;
      const days = daysSinceActive(node.lastActive);
      if (days <= 1) return 1.0;
      if (days <= 7) return 0.8;
      return 0.5;
    },
    enablePulse: true,
    pulseFrequency: 1,
    pulseAmplitude: 0.1,
    enableWireframe: true,
    enableGlow: true,
  });

  const { linkMaterial, linkWidth, linkDirectionalParticles } = useForceGraphLinkRenderer({
    getLinkColor: (link: any) => linkColors[link.type] || '#6b7280',
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
};
