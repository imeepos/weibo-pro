import React from 'react';

interface PerformanceMonitorProps {
  showDebugHud: boolean;
  fps: number;
  frameTime: number;
  nodesCount: number;
  linksCount: number;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDebugHud,
  fps,
  frameTime,
  nodesCount,
  linksCount,
}) => {
  if (!showDebugHud) return null;

  return (
    <div className="absolute top-20 left-4 backdrop-blur-sm bg-background/50 text-foreground rounded-md p-2 text-xs font-mono">
      <div className="font-bold mb-1">⚡ 性能监控</div>
      <div>
        FPS: <span className={fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}>
          {fps}
        </span>
      </div>
      <div>帧时间: {frameTime}ms</div>
      <div>节点: {nodesCount}</div>
      <div>边: {linksCount}</div>
    </div>
  );
};