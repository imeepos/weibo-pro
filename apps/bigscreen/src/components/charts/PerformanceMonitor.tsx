import React from 'react';

interface PerformanceMonitorProps {
  showDebugHud: boolean;
  fps: number;
  frameTime: number;
  nodesCount: number;
  linksCount: number;
  originalNodesCount?: number;
  originalLinksCount?: number;
  performanceLevel?: 'high' | 'medium' | 'low';
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDebugHud,
  fps,
  frameTime,
  nodesCount,
  linksCount,
  originalNodesCount,
  originalLinksCount,
  performanceLevel = 'high',
}) => {
  if (!showDebugHud) return null;

  const samplingRate = originalNodesCount ? (nodesCount / originalNodesCount * 100).toFixed(1) : null;

  return (
    <div className="absolute top-20 left-4 backdrop-blur-sm bg-background/50 text-foreground rounded-md p-2 text-xs font-mono">
      <div className="font-bold mb-1 flex items-center gap-2">
        ⚡ 性能监控
        <span className={`text-xs px-1 rounded ${
          performanceLevel === 'high' ? 'bg-green-500/20 text-green-400' :
          performanceLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {performanceLevel === 'high' ? '高' : performanceLevel === 'medium' ? '中' : '低'}
        </span>
      </div>
      <div>
        FPS: <span className={fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}>
          {fps}
        </span>
      </div>
      <div>帧时间: {frameTime}ms</div>
      <div>
        节点: {nodesCount}
        {originalNodesCount && originalNodesCount > nodesCount && (
          <span className="text-gray-500 ml-1">
            ({samplingRate}%)
          </span>
        )}
      </div>
      <div>
        边: {linksCount}
        {originalLinksCount && originalLinksCount > linksCount && (
          <span className="text-gray-500 ml-1">
            ({((linksCount / originalLinksCount) * 100).toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
};