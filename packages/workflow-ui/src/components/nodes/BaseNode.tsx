import React, { memo, useEffect } from 'react'
import { Handle, Position, useUpdateNodeInternals, useReactFlow } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { WorkflowNode } from '../../types'
import { findNodeType, getNodeMetadata } from '../../adapters'
import { cn } from '../../utils/cn'
import { useRender } from './hook'
import { fromJson, type IAstStates } from '@sker/workflow'
import { NODE_STATE_COLORS, NODE_STATE_LABELS } from '../../types/node.types'
import { Clock, Play, TrendingUp, Check, X, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * 状态图标组件
 */
const StateIcon = ({ state }: { state: IAstStates }) => {
  const iconProps = {
    size: 12,
    strokeWidth: 2,
    className: 'shrink-0'
  }

  switch (state) {
    case 'pending':
      return <Clock {...iconProps} />
    case 'running':
      return <Play {...iconProps} fill="currentColor" />
    case 'emitting':
      return <TrendingUp {...iconProps} />
    case 'success':
      return <Check {...iconProps} />
    case 'fail':
      return <X {...iconProps} />
  }
}

/**
 * 状态徽章组件
 */
const StatusBadge = ({ state }: { state?: IAstStates }) => {
  if (!state || state === 'pending') return null

  const stateColor = NODE_STATE_COLORS[state]
  const stateLabel = NODE_STATE_LABELS[state]

  // 动画效果样式
  const getAnimationClass = () => {
    if (state === 'running') return 'animate-pulse'
    if (state === 'emitting') return 'animate-bounce'
    return ''
  }

  return (
    <div
      className={cn(
        'absolute -top-2 -right-2 z-10',
        'flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-[10px] font-medium text-white shadow-lg',
        getAnimationClass()
      )}
      style={{ backgroundColor: stateColor }}
      title={stateLabel}
    >
      <StateIcon state={state} />
      <span>{stateLabel}</span>
    </div>
  )
}


const HandleWrapper = ({
  port,
  type,
  isCollapsed,
}: {
  port?: { property: string; label?: string; isMulti?: boolean };
  type: 'source' | 'target';
  isCollapsed?: boolean;
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
      isConnectable={true}
      className={cn(
        '!w-3 !h-3 !border-2 rounded-full transition-all duration-150',
        'hover:!w-4 hover:!h-4 hover:shadow-lg',
        '!z-50 !cursor-crosshair',
        isTarget
          ? '!bg-blue-500 !border-blue-300 hover:!bg-blue-400'
          : '!bg-green-500 !border-green-300 hover:!bg-green-400',
        isCollapsed && '!opacity-0 !pointer-events-none !w-0 !h-0'
      )}
    />
  );
};

const PortRow = ({
  input,
  output,
  isCollapsed,
}: {
  input?: { property: string; label?: string; isMulti?: boolean };
  output?: { property: string; label?: string; isMulti?: boolean };
  isCollapsed?: boolean;
}) => (
  <div className={cn(
    "relative flex items-center justify-between h-6 px-2",
    isCollapsed && "h-0 overflow-hidden opacity-0"
  )}>
    <div className="flex items-center gap-1 relative">
      {input && (
        <>
          <HandleWrapper port={input} type="target" isCollapsed={isCollapsed} />
          {!isCollapsed && (
            <>
              <span className="text-xs text-slate-200 truncate ml-2">
                {input.label || input.property}
              </span>
              {input.isMulti && <span className="text-[10px] text-slate-400 font-mono">[]</span>}
            </>
          )}
        </>
      )}
    </div>
    <div className="flex items-center gap-1 relative">
      {output && (
        <>
          {!isCollapsed && (
            <>
              {output.isMulti && <span className="text-[10px] text-slate-400 font-mono">[]</span>}
              <span className="text-xs text-slate-200 truncate mr-2">
                {output.label || output.property}
              </span>
            </>
          )}
          <HandleWrapper port={output} type="source" isCollapsed={isCollapsed} />
        </>
      )}
    </div>
  </div>
);

export const BaseNode = memo(({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const nodeClass = findNodeType(data.type)!;
  const metadata = getNodeMetadata(nodeClass);
  const updateNodeInternals = useUpdateNodeInternals();
  const CustomRender = useRender(fromJson(data));
  const { setNodes } = useReactFlow();
  const isCollapsed = data.collapsed ?? false;

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, metadata.inputs.length, metadata.outputs.length, isCollapsed, updateNodeInternals]);

  const toggleCollapse = (event: React.MouseEvent) => {
    event.stopPropagation();
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, collapsed: !isCollapsed } }
          : node
      )
    );
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const customEvent = new CustomEvent('node-context-menu', {
      detail: { nodeId: id, event, nodeData: data },
    })
    window.dispatchEvent(customEvent)
  }

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    const customEvent = new CustomEvent('node-double-click', {
      detail: { nodeId: id, nodeData: data },
    })
    window.dispatchEvent(customEvent)
  }

  const getBorderColor = () => {
    if (selected) return '#818cf6';
    if (data.state) return NODE_STATE_COLORS[data.state as keyof typeof NODE_STATE_COLORS] || NODE_STATE_COLORS.pending;
    return 'transparent';
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border-[2px] relative',
        'group pb-1 shadow-xs rounded-[15px] bg-workflow-block-bg hover:shadow-lg',
        'cursor-move select-none transition-all duration-200 max-h-[480px]',
        isCollapsed ? 'min-w-[180px]' : 'min-w-[240px]'
      )}
      style={{
        borderColor: getBorderColor(),
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, width 0.2s ease'
      }}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      <StatusBadge state={data.state as IAstStates} />

      <div className="flex items-center rounded-t-2xl px-3 py-4 border-b">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-lg mr-2 shrink-0"
          style={{ backgroundColor: data.color || '#3b82f6' }}
        >
          <div className="w-3 h-3 bg-white rounded-sm"></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {data.name || metadata.title || data.type}
          </div>
          {data.description && !isCollapsed && (
            <div className="text-xs text-slate-400 truncate mt-0.5">
              {data.description}
            </div>
          )}
        </div>
        <button
          onClick={toggleCollapse}
          className="ml-2 shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          title={isCollapsed ? '展开节点' : '折叠节点'}
        >
          {isCollapsed ? (
            <ChevronDown size={14} className="text-white" />
          ) : (
            <ChevronUp size={14} className="text-white" />
          )}
        </button>
      </div>

      <div className={cn(
        "flex flex-col gap-1 relative transition-all duration-200",
        isCollapsed ? "mt-0" : "mt-2"
      )}>
        {Array.from({ length: Math.max(metadata.inputs.length, metadata.outputs.length) }).map((_, index) => (
          <PortRow
            key={`port-${index}`}
            input={metadata.inputs[index]}
            output={metadata.outputs[index]}
            isCollapsed={isCollapsed}
          />
        ))}
        <div className="relative overflow-auto w-full h-full max-h-[380px]">
          {!isCollapsed && CustomRender}
        </div>
      </div>
    </div>
  )
})

BaseNode.displayName = 'BaseNode'
