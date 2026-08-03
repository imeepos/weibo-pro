import React from 'react';
import * as THREE from 'three';
import { Search, AlertTriangle } from 'lucide-react';
import {
  ForceGraph3D,
  type ForceGraph3DHandle,
  type GraphNode,
  type GraphLink,
  type GraphData,
} from '@sker/ui/components/ui/force-graph-3d';
import {
  GraphControlPanel,
  ControlGroup,
  SliderControl,
  SwitchControl,
} from '@sker/ui/components/ui/graph-control-panel';
import { Button } from '@sker/ui/components/ui/button';
import type { GraphConfig } from './UserDetection3D.utils';

interface GraphStageProps {
  isLoading: boolean;
  error: Error | null;
  userCount: number;
  viewMode: '2d' | '3d';
  fgRef: React.RefObject<ForceGraph3DHandle | null>;
  graphData: GraphData;
  nodeLabel: (node: GraphNode) => string;
  linkMaterial: (link: GraphLink) => THREE.Material;
  onNodeClick: (node: any) => void;
  graphConfig: GraphConfig;
  onGraphConfigChange: (updater: (prev: GraphConfig) => GraphConfig) => void;
  onRetry: () => void;
}

export function GraphStage({
  isLoading,
  error,
  userCount,
  viewMode,
  fgRef,
  graphData,
  nodeLabel,
  linkMaterial,
  onNodeClick,
  graphConfig,
  onGraphConfigChange,
  onRetry,
}: GraphStageProps) {
  return (
    <>
      {viewMode === '3d' ? (
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">加载中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-red-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <p>{error.message}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
                  重试
                </Button>
              </div>
            </div>
          ) : userCount === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>未找到匹配的用户</p>
              </div>
            </div>
          ) : (
            <ForceGraph3D
              ref={fgRef}
              graphData={graphData}
              nodeAutoColorBy="riskLevel"
              nodeLabel={nodeLabel}
              linkMaterial={linkMaterial}
              linkWidth={link => Math.max(0.5, link.value * 3)}
              linkDirectionalParticles={2}
              linkDirectionalParticleSpeed={0.005}
              onNodeClick={onNodeClick}
              backgroundColor="rgba(0, 0, 0, 0)"
              showNavInfo={false}
              controlType="orbit"
              enableNodeDrag={true}
              enableNavigationControls={true}
              enablePointerInteraction={true}
              warmupTicks={50}
              cooldownTicks={100}
            />
          )}

          {/* 3D 控制面板 */}
          {viewMode === '3d' && !isLoading && !error && userCount > 0 && (
            <GraphControlPanel title="图形设置" position="bottom-right">
              <ControlGroup title="节点和连线">
                <SliderControl
                  label="节点大小"
                  value={graphConfig.nodeSize * 100}
                  min={10}
                  max={300}
                  suffix="%"
                  onValueChange={v => onGraphConfigChange(prev => ({ ...prev, nodeSize: v / 100 }))}
                />
                <SliderControl
                  label="连线距离"
                  value={graphConfig.linkDistance}
                  min={50}
                  max={300}
                  onValueChange={v => onGraphConfigChange(prev => ({ ...prev, linkDistance: v }))}
                />
                <SliderControl
                  label="斥力强度"
                  value={Math.abs(graphConfig.chargeStrength)}
                  min={50}
                  max={500}
                  onValueChange={v =>
                    onGraphConfigChange(prev => ({ ...prev, chargeStrength: -v }))
                  }
                />
              </ControlGroup>
              <ControlGroup title="显示选项">
                <SwitchControl
                  label="显示标签"
                  checked={graphConfig.showLabels}
                  onCheckedChange={v => onGraphConfigChange(prev => ({ ...prev, showLabels: v }))}
                />
                <SwitchControl
                  label="自动旋转"
                  checked={graphConfig.autoRotate}
                  onCheckedChange={v => onGraphConfigChange(prev => ({ ...prev, autoRotate: v }))}
                />
              </ControlGroup>
            </GraphControlPanel>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          2D 视图开发中...
        </div>
      )}
    </>
  );
}
