import { ForceGraph3D } from '@sker/ui/components/ui/force-graph-3d';
import { useForceGraphNodeRenderer } from '@sker/ui/components/ui/use-force-graph-node-renderer';
import {
  generateSampleData,
  nodeShapes,
  nodeColors,
  daysSinceActive,
  opacityByDays,
} from './data';

export const NodeShapeVariationsRender = () => {
  const graphData = generateSampleData();

  const shapes = nodeShapes;
  const colors = nodeColors;

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
};

export const NodeOpacityByActivityRender = () => {
  const graphData = generateSampleData();

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes: new Set(),
    getNodeColor: () => '#3b82f6',
    getNodeOpacity: (node: any) => {
      if (!node.lastActive) return 1.0;
      return opacityByDays(daysSinceActive(node.lastActive));
    },
  });

  return (
    <div className="relative w-screen h-screen bg-black">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(node: any) => `${node.name} - ${daysSinceActive(node.lastActive)}天前活跃`}
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
};

export const PulseAnimationConfigRender = () => {
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
};
