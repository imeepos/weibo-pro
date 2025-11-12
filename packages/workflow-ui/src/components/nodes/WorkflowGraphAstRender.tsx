import React, { memo, useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { WorkflowNodeProps } from '../../types'
import { getNodeMetadata } from '../../adapters'
import { cn } from '../../utils/cn'
import { WorkflowGraphAst } from '@sker/workflow'

// 简单的状态指示器
const NodeStatus = ({ state, error }: { state?: string; error?: unknown }) => {
  const statusConfig = {
    pending: { color: 'bg-gray-500', label: '待执行' },
    running: { color: 'bg-blue-500 animate-pulse', label: '执行中' },
    success: { color: 'bg-green-500', label: '成功' },
    fail: { color: 'bg-red-500', label: '失败' },
  };

  const config = statusConfig[state as keyof typeof statusConfig] || statusConfig.pending;

  const errorMessage = error ? (typeof error === 'string' ? error : JSON.stringify(error)) : undefined;

  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-xs text-gray-300">{config.label}</span>
      {errorMessage && <span className="text-xs text-red-400" title={errorMessage}>⚠</span>}
    </div>
  );
};

// 端口包装器
const HandleWrapper = ({
  port,
  type,
}: {
  port?: { property: string; label?: string; isMulti?: boolean };
  type: 'source' | 'target';
}) => {
  if (!port) {
    return null;
  }

  const isTarget = type === 'target';

  return (
    <div
      className={cn(
        'w-3 h-3 border-2 rounded-full',
        isTarget ? 'bg-blue-500 border-blue-300' : 'bg-green-500 border-green-300'
      )}
    />
  );
};

// 端口行
const PortRow = ({
  input,
  output,
}: {
  input?: { property: string; label?: string; isMulti?: boolean };
  output?: { property: string; label?: string; isMulti?: boolean };
}) => (
  <div className="relative flex items-center gap-2 h-6">
    <HandleWrapper port={input} type="target" />
    <HandleWrapper port={output} type="source" />
    <div className="flex items-center flex-1 pl-2">
      {input && (
        <div className="flex items-center gap-1 text-xs text-slate-200">
          <span className="truncate">{input.label || input.property}</span>
          {input.isMulti && <span className="text-[10px] text-slate-400 font-mono">[]</span>}
        </div>
      )}
    </div>

    <div className="flex items-center gap-2 flex-1 justify-end pr-2">
      {output && (
        <div className="flex items-center gap-1 text-xs text-slate-200">
          <span className="truncate">{output.label || output.property}</span>
          {output.isMulti && <span className="text-[10px] text-slate-400 font-mono">[]</span>}
        </div>
      )}
    </div>
  </div>
);

// 工作流缩略图组件
const WorkflowThumbnail = ({ workflowAst }: { workflowAst?: WorkflowGraphAst }) => {
  if (!workflowAst) {
    return (
      <div className="flex items-center justify-center h-16 bg-slate-700/50 rounded border border-slate-600">
        <span className="text-xs text-slate-400">空工作流</span>
      </div>
    );
  }

  const nodeCount = workflowAst.nodes.length;
  const edgeCount = workflowAst.edges.length;
  const completedNodes = workflowAst.nodes.filter(node => node.state === 'success').length;
  const failedNodes = workflowAst.nodes.filter(node => node.state === 'fail').length;

  return (
    <div className="h-16 bg-slate-700/50 rounded border border-slate-600 p-2">
      <div className="flex justify-between items-center text-xs">
        <div className="text-slate-300">
          {nodeCount} 节点
        </div>
        <div className="text-slate-400">
          {edgeCount} 边
        </div>
      </div>

      <div className="mt-1 flex gap-1">
        {completedNodes > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-[10px] text-green-400">{completedNodes}</span>
          </div>
        )}
        {failedNodes > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            <span className="text-[10px] text-red-400">{failedNodes}</span>
          </div>
        )}
      </div>

      {workflowAst.name && (
        <div className="mt-1 text-[10px] text-slate-400 truncate" title={workflowAst.name}>
          {workflowAst.name}
        </div>
      )}
    </div>
  );
};

export const WorkflowGraphAstRender = memo(({ id, data, selected }: WorkflowNodeProps) => {
  const metadata = getNodeMetadata(data.nodeClass);
  const maxPorts = Math.max(metadata.inputs.length, metadata.outputs.length);
  const { getNodes } = useReactFlow();

  // 获取当前节点的 WorkflowGraphAst 实例
  const workflowAst = data.ast as WorkflowGraphAst;

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // 触发打开子工作流弹框事件
    const customEvent = new CustomEvent('open-sub-workflow', {
      detail: {
        nodeId: id,
        workflowAst: workflowAst,
        position: { x: event.clientX, y: event.clientY }
      },
    });
    window.dispatchEvent(customEvent);
  }, [id, workflowAst]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // 触发自定义事件，让 WorkflowCanvas 处理
    const customEvent = new CustomEvent('node-context-menu', {
      detail: { nodeId: id, event, nodeData: data },
    });
    window.dispatchEvent(customEvent);
  };

  return (
    <div
      className={cn(
        'px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg cursor-pointer',
        'hover:bg-slate-700 hover:border-slate-500',
        selected && 'bg-blue-900 border-blue-500',
        'select-none'
      )}
      style={{
        minWidth: '200px'
      }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* 节点标题 */}
      <div className="mb-2 pb-1.5 border-b border-slate-600 flex items-center justify-between">
        <div className="text-sm font-medium text-white">
          {data.label}
        </div>
        <NodeStatus state={data.state} error={data.error} />
      </div>

      {/* 工作流缩略图 */}
      <div className="mb-2">
        <WorkflowThumbnail workflowAst={workflowAst} />
      </div>

      {/* 提示文字 */}
      <div className="text-xs text-slate-400 text-center mb-2">
        双击打开子工作流
      </div>

      {/* 端口区域 */}
      {maxPorts > 0 && (
        <div className="space-y-0">
          {Array.from({ length: maxPorts }).map((_, index) => (
            <PortRow
              key={
                metadata.inputs[index]?.property ??
                metadata.outputs[index]?.property ??
                `port-${index}`
              }
              input={metadata.inputs[index]}
              output={metadata.outputs[index]}
            />
          ))}
        </div>
      )}
    </div>
  );
});

WorkflowGraphAstRender.displayName = 'WorkflowGraphAstRender';