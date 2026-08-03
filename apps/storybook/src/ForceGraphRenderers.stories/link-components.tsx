import { ForceGraph3D } from '@sker/ui/components/ui/force-graph-3d';
import { useForceGraphNodeRenderer } from '@sker/ui/components/ui/use-force-graph-node-renderer';
import { useForceGraphLinkRenderer } from '@sker/ui/components/ui/use-force-graph-link-renderer';
import { generateSampleData, linkColors } from './data';

export const LinkColorByTypeRender = () => {
  const graphData = generateSampleData();

  const { nodeThreeObject } = useForceGraphNodeRenderer({
    highlightNodes: new Set(),
    getNodeColor: () => '#ffffff',
  });

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
};

export const LinkParticleAnimationRender = () => {
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
};
