import React, { memo, useEffect } from 'react'
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { WorkflowNode } from '../../types'
import { findNodeType, getNodeMetadata } from '../../adapters'
import { cn } from '../../utils/cn'
import { useRender } from './hook'

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
    <Handle
      type={type}
      id={port.property}
      position={isTarget ? Position.Left : Position.Right}
      className={cn(
        '!w-3 !h-3 !border-2 rounded-full',
        isTarget ? '!bg-blue-500 !border-blue-300' : '!bg-green-500 !border-green-300'
      )}
    />
  );
};

const PortRow = ({
  input,
  output,
  offsetTop,
}: {
  input?: { property: string; label?: string; isMulti?: boolean };
  output?: { property: string; label?: string; isMulti?: boolean };
  offsetTop?: number;
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

export const BaseNode = memo(({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const nodeClass = findNodeType(data.type)!;
  const metadata = getNodeMetadata(nodeClass);
  const updateNodeInternals = useUpdateNodeInternals();
  const CustomRender = useRender(data);

  // 通知 React Flow 更新节点内部状态（Handle 位置）
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, metadata.inputs.length, metadata.outputs.length, updateNodeInternals]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    // 触发自定义事件，让 WorkflowCanvas 处理
    const customEvent = new CustomEvent('node-context-menu', {
      detail: { nodeId: id, event, nodeData: data },
    })
    window.dispatchEvent(customEvent)
  }

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    // 触发自定义事件，打开左侧抽屉
    const customEvent = new CustomEvent('node-double-click', {
      detail: { nodeId: id, nodeData: data },
    })
    window.dispatchEvent(customEvent)
  }

  return (
    <div
      className={cn(
        'px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg cursor-move',
        'hover:bg-slate-700 hover:border-slate-500',
        selected && 'bg-blue-900 border-blue-500',
        'select-none'
      )}
      style={{
        minWidth: '120px'
      }}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      {/* 简洁的节点标题 */}
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-white">
          {data.label}
        </div>
        <NodeStatus state={data.state} error={data.error} />
      </div>

      {/* 自定义渲染内容 */}
      {CustomRender && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          {CustomRender}
        </div>
      )}
    </div>
  )
})

BaseNode.displayName = 'BaseNode'
